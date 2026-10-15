import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Campus Grove" },
      { name: "description", content: "Choose a new password for your account." },
      { property: "og:title", content: "Reset password — Campus Grove" },
      { property: "og:description", content: "Choose a new password." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/auth", search: { as: "student", mode: "signin" } });
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-6 shadow-soft">
        <h1 className="text-2xl font-extrabold text-primary">Set a new password</h1>
        <div className="space-y-1.5">
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <Button className="w-full" type="submit">Update password</Button>
      </form>
    </div>
  );
}
