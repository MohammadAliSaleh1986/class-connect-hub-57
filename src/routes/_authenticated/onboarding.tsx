import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { BookOpen, Clock, Presentation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { fetchMe, homeFor } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/onboarding")({
  beforeLoad: async () => {
    const me = await fetchMe();
    if (!me) throw redirect({ to: "/auth", search: { as: "student", mode: "signin" } });
    const home = homeFor(me);
    if (home !== "/onboarding" && !(me.application === "pending" && !me.roles.includes("teacher") && !me.roles.includes("student"))) {
      if (home !== "/admin" || me.application !== "pending") throw redirect({ to: home });
    }
    return { me };
  },
  head: () => ({ meta: [{ title: "Welcome — Campus Grove" }, { name: "description", content: "Finish setting up your account." }] }),
  component: Onboarding,
});

function Onboarding() {
  const { me } = Route.useRouteContext();
  const navigate = useNavigate();
  const router = useRouter();

  async function choose(t: "student" | "teacher") {
    const { error } = await supabase.rpc("choose_account_type", { _type: t });
    if (error) return toast.error(error.message);
    const next = await fetchMe();
    if (next) navigate({ to: homeFor(next) === "/onboarding" ? "/onboarding" : homeFor(next), replace: true });
    router.invalidate();
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl bg-card p-8 shadow-soft">
        {me.application === "pending" ? (
          <>
            <Clock className="h-10 w-10 text-highlight" />
            <h1 className="mt-4 text-3xl font-extrabold text-primary">Awaiting approval</h1>
            <p className="mt-2 text-muted-foreground">
              Thanks, {me.fullName}. Your teacher account is waiting for an administrator to approve it. You'll get access as soon as it's approved.
            </p>
          </>
        ) : me.application === "rejected" ? (
          <>
            <h1 className="text-3xl font-extrabold text-primary">Request declined</h1>
            <p className="mt-2 text-muted-foreground">Your teacher access request was declined. Please contact your school administrator.</p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold text-primary">Welcome, {me.fullName}</h1>
            <p className="mt-2 text-muted-foreground">How will you use Campus Grove?</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button onClick={() => choose("student")} className="rounded-2xl border p-5 text-left transition hover:border-accent hover:bg-secondary">
                <BookOpen className="h-6 w-6 text-accent" />
                <p className="mt-3 font-bold text-primary">I'm a student</p>
                <p className="text-sm text-muted-foreground">Register for courses and learn.</p>
              </button>
              <button onClick={() => choose("teacher")} className="rounded-2xl border p-5 text-left transition hover:border-accent hover:bg-secondary">
                <Presentation className="h-6 w-6 text-accent" />
                <p className="mt-3 font-bold text-primary">I'm a teacher</p>
                <p className="text-sm text-muted-foreground">Needs admin approval.</p>
              </button>
            </div>
          </>
        )}
        <div className="mt-8 flex gap-2">
          {me.roles.includes("admin") && <Button onClick={() => navigate({ to: "/admin" })}>Go to admin</Button>}
          <Button variant="outline" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    </div>
  );
}
