import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Course = {
  id: string; teacher_id: string; code: string; title: string; description: string;
  semester: string; credits: number; capacity: number; created_at: string;
};
export type CourseStat = { course_id: string; enrolled_count: number; avg_grade_pct: number | null; avg_rating: number | null; rating_count: number };
export type Grade = { id: string; course_id: string; student_id: string; title: string; score: number; max_score: number; created_at: string };
export type Material = { id: string; course_id: string; title: string; description: string; kind: string; file_path: string | null; file_name: string | null; created_at: string };

function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export const coursesQuery = () =>
  queryOptions({
    queryKey: ["courses"],
    queryFn: async () => must(await supabase.from("courses").select("*").order("code")) as Course[],
  });

export const courseStatsQuery = () =>
  queryOptions({
    queryKey: ["course-stats"],
    queryFn: async () => {
      const rows = must(await supabase.rpc("course_stats")) as CourseStat[];
      return new Map(rows.map((r) => [r.course_id, { ...r, enrolled_count: Number(r.enrolled_count), avg_grade_pct: r.avg_grade_pct == null ? null : Number(r.avg_grade_pct), avg_rating: r.avg_rating == null ? null : Number(r.avg_rating) }]));
    },
  });

export const profilesQuery = () =>
  queryOptions({
    queryKey: ["profiles"],
    queryFn: async () => {
      const rows = must(await supabase.from("profiles").select("id, full_name, email"));
      return new Map(rows.map((p) => [p.id, p]));
    },
  });

export const enrollmentsQuery = () =>
  queryOptions({
    queryKey: ["enrollments"],
    queryFn: async () => must(await supabase.from("enrollments").select("*")),
  });

export const gradesQuery = () =>
  queryOptions({
    queryKey: ["grades"],
    queryFn: async () => (must(await supabase.from("grades").select("*").order("created_at", { ascending: false })) as Grade[]).map((g) => ({ ...g, score: Number(g.score), max_score: Number(g.max_score) })),
  });

export const materialsQuery = () =>
  queryOptions({
    queryKey: ["materials"],
    queryFn: async () => must(await supabase.from("materials").select("*").order("created_at", { ascending: false })) as Material[],
  });

export const progressQuery = () =>
  queryOptions({
    queryKey: ["progress"],
    queryFn: async () => must(await supabase.from("material_progress").select("*")),
  });

export const ratingsQuery = () =>
  queryOptions({
    queryKey: ["ratings"],
    queryFn: async () => must(await supabase.from("course_ratings").select("*")),
  });

export const totalStudentsQuery = () =>
  queryOptions({
    queryKey: ["total-students"],
    queryFn: async () => Number(must(await supabase.rpc("total_students"))),
  });

export function pct(score: number, max: number) {
  return max > 0 ? (score / max) * 100 : 0;
}

export function avg(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

export function letter(p: number | null) {
  if (p == null) return "—";
  if (p >= 90) return "A";
  if (p >= 80) return "B";
  if (p >= 70) return "C";
  if (p >= 60) return "D";
  return "F";
}

export function fmtPct(p: number | null | undefined) {
  return p == null ? "—" : `${Math.round(p)}%`;
}

export async function signedUrl(path: string) {
  const { data, error } = await supabase.storage.from("course-materials").createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
