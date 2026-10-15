import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  BarChart3, BookOpen, ClipboardList, GraduationCap, LayoutDashboard, LogOut, ShieldCheck, FilePlus2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Me } from "@/lib/auth";

type NavItem = { to: string; label: string; icon: typeof BookOpen; exact?: boolean };

const NAV: Record<"student" | "teacher" | "admin", NavItem[]> = {
  student: [
    { to: "/student", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/student/courses", label: "My courses", icon: BookOpen },
    { to: "/student/register", label: "Course registration", icon: FilePlus2 },
    { to: "/student/grades", label: "Grades", icon: BarChart3 },
  ],
  teacher: [
    { to: "/teacher", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/teacher/courses", label: "My courses", icon: BookOpen },
    { to: "/teacher/grades", label: "Gradebook", icon: ClipboardList },
  ],
  admin: [{ to: "/admin", label: "Teacher approvals", icon: ShieldCheck, exact: true }],
};

export function DashboardShell({ area, me, children }: { area: "student" | "teacher" | "admin"; me: Me; children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const items = [...NAV[area]];
  if (area !== "admin" && me.roles.includes("admin")) items.push(...NAV.admin);
  if (area === "admin") {
    if (me.roles.includes("teacher")) items.unshift({ to: "/teacher", label: "Teacher area", icon: LayoutDashboard, exact: true });
    if (me.roles.includes("student")) items.unshift({ to: "/student", label: "Student area", icon: LayoutDashboard, exact: true });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { as: area === "teacher" ? "teacher" : "student", mode: "signin" }, replace: true });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:w-64">
        <Link to="/" className="flex items-center gap-2 px-4 py-6 font-display text-lg font-bold text-sidebar-accent-foreground">
          <GraduationCap className="h-6 w-6 shrink-0 text-sidebar-primary" />
          <span className="hidden md:inline">Campus Grove</span>
        </Link>
        <p className="hidden px-5 pb-2 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/60 md:block">
          {area} portal
        </p>
        <nav className="flex flex-1 flex-col gap-1 px-2">
          {items.map((it) => (
            <Link
              key={it.to + it.label}
              to={it.to}
              activeOptions={{ exact: !!it.exact }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground" }}
            >
              <it.icon className="h-5 w-5 shrink-0" />
              <span className="hidden md:inline">{it.label}</span>
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 hidden px-2 md:block">
            <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">{me.fullName}</p>
            <p className="truncate text-xs text-sidebar-foreground/70">{me.email}</p>
          </div>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent">
            <LogOut className="h-5 w-5 shrink-0" /> <span className="hidden md:inline">Sign out</span>
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 md:px-10">{children}</main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon }: { label: string; value: ReactNode; hint?: string; icon?: typeof BookOpen }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-5 w-5 text-accent" />}
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-primary">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-primary">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-muted p-6 text-center text-sm text-muted-foreground">{children}</p>;
}
