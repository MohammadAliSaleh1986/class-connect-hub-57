import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "teacher" | "student";

export interface Me {
  userId: string;
  email: string | null;
  fullName: string;
  roles: Role[];
  application: "pending" | "approved" | "rejected" | null;
}

export async function fetchMe(): Promise<Me | null> {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return null;
  const [{ data: roles }, { data: profile }, { data: app }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("teacher_applications").select("status").eq("user_id", user.id).maybeSingle(),
  ]);
  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name || user.email?.split("@")[0] || "User",
    roles: (roles ?? []).map((r) => r.role as Role),
    application: (app?.status as Me["application"]) ?? null,
  };
}

/** Where a signed-in user should land, based on their roles. */
export function homeFor(me: Me): "/student" | "/teacher" | "/admin" | "/onboarding" {
  if (me.roles.includes("teacher")) return "/teacher";
  if (me.roles.includes("student")) return "/student";
  if (me.roles.includes("admin")) return "/admin";
  return "/onboarding";
}

export const PENDING_TYPE_KEY = "edu_pending_account_type";
