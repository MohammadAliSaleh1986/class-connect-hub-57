import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { GraduationCap, BookOpen, Presentation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchMe, homeFor, PENDING_TYPE_KEY } from "@/lib/auth";
import { cn } from "@/lib/utils";

const search = z.object({
  as: z.enum(["student", "teacher"]).catch("student"),
  mode: z.enum(["signin", "signup"]).catch("signin"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Sign in — Campus Grove" },
      { name: "description", content: "Sign in or create a student or teacher account." },
      { property: "og:title", content: "Sign in — Campus Grove" },
      { property: "og:description", content: "Student and teacher sign in." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { as, mode } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const setSearch = (s: Partial<{ as: "student" | "teacher"; mode: "signin" | "signup" }>) =>
    navigate({ to: "/auth", search: { as, mode, ...s }, replace: true });

  async function finish(expected: "student" | "teacher") {
    let me = await fetchMe();
    if (!me) return;
    const pending = localStorage.getItem(PENDING_TYPE_KEY);
    if (!me.roles.includes("student") && !me.roles.includes("teacher") && !me.application && pending) {
      await supabase.rpc("choose_account_type", { _type: pending });
      me = await fetchMe();
      if (!me) return;
    }
    localStorage.removeItem(PENDING_TYPE_KEY);

    const hasStudent = me.roles.includes("student");
    const hasTeacher = me.roles.includes("teacher");
    if (expected === "teacher" && !hasTeacher && hasStudent) {
      await supabase.auth.signOut();
      toast.error("This is a student account. Please use the student sign in.");
      return;
    }
    if (expected === "student" && !hasStudent && hasTeacher) {
      await supabase.auth.signOut();
      toast.error("This is a teacher account. Please use the teacher sign in.");
      return;
    }
    navigate({ to: homeFor(me), replace: true });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish(as);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?as=${as}`,
            data: { full_name: fullName, account_type: as },
          },
        });
        if (error) throw error;
        if (data.session) await finish(as);
        else setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await finish(as);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    localStorage.setItem(PENDING_TYPE_KEY, as);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth?as=${as}`,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    await finish(as);
  }

  async function forgot() {
    if (!email) return toast.error("Enter your email first");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Check your email for a reset link");
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-hero p-10 text-sidebar-foreground md:flex">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-sidebar-accent-foreground">
          <GraduationCap className="h-6 w-6 text-sidebar-primary" /> Campus Grove
        </Link>
        <div>
          <h2 className="text-4xl font-extrabold text-sidebar-accent-foreground">
            {as === "teacher" ? "Teach, share, and see every student grow." : "Learn at your pace, see your progress."}
          </h2>
          <p className="mt-4 max-w-md">
            {as === "teacher"
              ? "New teacher accounts are reviewed by an administrator before access is granted."
              : "Register for your semester courses and watch lectures anytime."}
          </p>
        </div>
        <p className="text-sm">© Campus Grove</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
            {(["student", "teacher"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSearch({ as: r })}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold capitalize transition",
                  as === r ? "bg-card text-primary shadow-soft" : "text-muted-foreground",
                )}
              >
                {r === "student" ? <BookOpen className="h-4 w-4" /> : <Presentation className="h-4 w-4" />} {r}
              </button>
            ))}
          </div>

          <h1 className="text-3xl font-extrabold text-primary">
            {mode === "signup" ? `Create ${as} account` : `${as === "teacher" ? "Teacher" : "Student"} sign in`}
          </h1>

          {sent ? (
            <p className="mt-6 rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">
              Check your inbox at <b>{email}</b> and click the confirmation link to finish signing up.
            </p>
          ) : (
            <>
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label htmlFor="pw">Password</Label>
                    {mode === "signin" && (
                      <button type="button" onClick={forgot} className="text-xs text-muted-foreground hover:text-primary">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input id="pw" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
                </Button>
              </form>
              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>
              <Button variant="outline" className="w-full" onClick={google}>
                Continue with Google
              </Button>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
                <button className="font-semibold text-primary" onClick={() => setSearch({ mode: mode === "signup" ? "signin" : "signup" })}>
                  {mode === "signup" ? "Sign in" : "Create an account"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
