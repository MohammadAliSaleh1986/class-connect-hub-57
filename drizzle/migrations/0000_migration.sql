
create type public.app_role as enum ('admin','teacher','student');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Profiles readable by signed-in users" on public.profiles for select to authenticated using (true);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Admins read all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.teacher_applications (
  user_id uuid primary key,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
grant select on public.teacher_applications to authenticated;
grant all on public.teacher_applications to service_role;
alter table public.teacher_applications enable row level security;
create policy "Own application readable" on public.teacher_applications for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create or replace function public.choose_account_type(_type text)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from user_roles where user_id = uid and role in ('student','teacher')) then return 'exists'; end if;
  if exists (select 1 from teacher_applications where user_id = uid) then return 'pending'; end if;
  if _type = 'student' then
    insert into user_roles(user_id, role) values (uid, 'student');
    return 'student';
  elsif _type = 'teacher' then
    insert into teacher_applications(user_id) values (uid);
    return 'pending';
  end if;
  raise exception 'Invalid type';
end $$;
grant execute on function public.choose_account_type(text) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare t text := new.raw_user_meta_data->>'account_type';
begin
  insert into profiles(id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email);
  if not exists (select 1 from user_roles where role = 'admin') then
    insert into user_roles(user_id, role) values (new.id, 'admin');
  end if;
  if t = 'student' then
    insert into user_roles(user_id, role) values (new.id, 'student');
  elsif t = 'teacher' then
    insert into teacher_applications(user_id) values (new.id);
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.review_teacher(_user_id uuid, _approve boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
  update teacher_applications set status = case when _approve then 'approved' else 'rejected' end, reviewed_at = now() where user_id = _user_id;
  if _approve then
    insert into user_roles(user_id, role) values (_user_id, 'teacher') on conflict do nothing;
  end if;
end $$;
grant execute on function public.review_teacher(uuid, boolean) to authenticated;

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  code text not null,
  title text not null,
  description text not null default '',
  semester text not null,
  credits int not null default 3,
  capacity int not null default 40,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.courses to authenticated;
grant all on public.courses to service_role;
alter table public.courses enable row level security;
create policy "Courses readable" on public.courses for select to authenticated using (true);
create policy "Teachers create own courses" on public.courses for insert to authenticated with check (auth.uid() = teacher_id and public.has_role(auth.uid(),'teacher'));
create policy "Teachers update own courses" on public.courses for update to authenticated using (auth.uid() = teacher_id);
create policy "Teachers delete own courses" on public.courses for delete to authenticated using (auth.uid() = teacher_id);

create or replace function public.is_course_teacher(_course_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from courses where id = _course_id and teacher_id = auth.uid())
$$;

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (student_id, course_id)
);
grant select, insert, delete on public.enrollments to authenticated;
grant all on public.enrollments to service_role;
alter table public.enrollments enable row level security;

create or replace function public.is_enrolled(_course_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from enrollments where course_id = _course_id and student_id = auth.uid())
$$;

create policy "Students see own enrollments, teachers see their course" on public.enrollments for select to authenticated using (auth.uid() = student_id or public.is_course_teacher(course_id));
create policy "Students enroll themselves" on public.enrollments for insert to authenticated with check (auth.uid() = student_id and public.has_role(auth.uid(),'student'));
create policy "Students drop own enrollments" on public.enrollments for delete to authenticated using (auth.uid() = student_id);

create or replace function public.check_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from enrollments where course_id = new.course_id) >= (select capacity from courses where id = new.course_id) then
    raise exception 'This course is full';
  end if;
  return new;
end $$;
create trigger enrollments_capacity before insert on public.enrollments for each row execute function public.check_capacity();

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  kind text not null default 'document',
  file_path text,
  file_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.materials to authenticated;
grant all on public.materials to service_role;
alter table public.materials enable row level security;
create policy "Materials visible to teacher and enrolled" on public.materials for select to authenticated using (public.is_course_teacher(course_id) or public.is_enrolled(course_id));
create policy "Teacher adds materials" on public.materials for insert to authenticated with check (public.is_course_teacher(course_id));
create policy "Teacher updates materials" on public.materials for update to authenticated using (public.is_course_teacher(course_id));
create policy "Teacher deletes materials" on public.materials for delete to authenticated using (public.is_course_teacher(course_id));

create table public.material_progress (
  student_id uuid not null,
  material_id uuid not null references public.materials(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (student_id, material_id)
);
grant select, insert, delete on public.material_progress to authenticated;
grant all on public.material_progress to service_role;
alter table public.material_progress enable row level security;
create policy "Own progress" on public.material_progress for select to authenticated using (auth.uid() = student_id or exists (select 1 from materials m where m.id = material_id and public.is_course_teacher(m.course_id)));
create policy "Mark own progress" on public.material_progress for insert to authenticated with check (auth.uid() = student_id and exists (select 1 from materials m where m.id = material_id and public.is_enrolled(m.course_id)));
create policy "Unmark own progress" on public.material_progress for delete to authenticated using (auth.uid() = student_id);

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null,
  title text not null,
  score numeric not null,
  max_score numeric not null default 100,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.grades to authenticated;
grant all on public.grades to service_role;
alter table public.grades enable row level security;
create policy "Grades visible to student and teacher" on public.grades for select to authenticated using (auth.uid() = student_id or public.is_course_teacher(course_id));
create policy "Teacher adds grades" on public.grades for insert to authenticated with check (public.is_course_teacher(course_id) and exists (select 1 from enrollments e where e.course_id = grades.course_id and e.student_id = grades.student_id));
create policy "Teacher updates grades" on public.grades for update to authenticated using (public.is_course_teacher(course_id));
create policy "Teacher deletes grades" on public.grades for delete to authenticated using (public.is_course_teacher(course_id));

create table public.course_ratings (
  student_id uuid not null,
  course_id uuid not null references public.courses(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (student_id, course_id)
);
grant select, insert, update on public.course_ratings to authenticated;
grant all on public.course_ratings to service_role;
alter table public.course_ratings enable row level security;
create policy "Own ratings or teacher" on public.course_ratings for select to authenticated using (auth.uid() = student_id or public.is_course_teacher(course_id));
create policy "Enrolled students rate" on public.course_ratings for insert to authenticated with check (auth.uid() = student_id and public.is_enrolled(course_id));
create policy "Update own rating" on public.course_ratings for update to authenticated using (auth.uid() = student_id);

create or replace function public.course_stats()
returns table (course_id uuid, enrolled_count bigint, avg_grade_pct numeric, avg_rating numeric, rating_count bigint)
language sql stable security definer set search_path = public as $$
  select c.id,
    (select count(*) from enrollments e where e.course_id = c.id),
    (select round(avg(g.score / nullif(g.max_score,0) * 100), 1) from grades g where g.course_id = c.id),
    (select round(avg(r.rating)::numeric, 2) from course_ratings r where r.course_id = c.id),
    (select count(*) from course_ratings r where r.course_id = c.id)
  from courses c
$$;
grant execute on function public.course_stats() to authenticated;

create or replace function public.total_students()
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from user_roles where role = 'student'
$$;
grant execute on function public.total_students() to authenticated;

create policy "Teacher uploads course files" on storage.objects for insert to authenticated
  with check (bucket_id = 'course-materials' and public.is_course_teacher(((storage.foldername(name))[1])::uuid));
create policy "Teacher or enrolled reads course files" on storage.objects for select to authenticated
  using (bucket_id = 'course-materials' and (public.is_course_teacher(((storage.foldername(name))[1])::uuid) or public.is_enrolled(((storage.foldername(name))[1])::uuid)));
create policy "Teacher deletes course files" on storage.objects for delete to authenticated
  using (bucket_id = 'course-materials' and public.is_course_teacher(((storage.foldername(name))[1])::uuid));
