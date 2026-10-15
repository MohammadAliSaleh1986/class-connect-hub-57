import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, Empty, PageHeader, Panel } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchMe, homeFor } from "@/lib/auth";
import { profilesQuery } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const me = await fetchMe();
    if (!me) throw redirect({ to: "/auth", search: { as: "teacher", mode: "signin" } });
    if (!me.roles.includes("admin")) throw redirect({ to: homeFor(me) });
    return { me };
  },
  head: () => ({ meta: [{ title: "Admin — Campus Grove" }, { name: "description", content: "Approve teacher accounts." }] }),
  component: Admin,
});

function Admin() {
  const { me } = Route.useRouteContext();
  const qc = useQueryClient();
  const apps = useQuery({
    queryKey: ["teacher-apps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teacher_applications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const profiles = useQuery(profilesQuery());

  async function review(id: string, approve: boolean) {
    const { error } = await supabase.rpc("review_teacher", { _user_id: id, _approve: approve });
    if (error) return toast.error(error.message);
    toast.success(approve ? "Teacher approved" : "Request declined");
    qc.invalidateQueries({ queryKey: ["teacher-apps"] });
  }

  return (
    <DashboardShell area="admin" me={me}>
      <PageHeader title="Teacher approvals" subtitle="Review people who signed up as teachers." />
      <Panel title="Requests">
        {!apps.data?.length ? (
          <Empty>No teacher requests yet.</Empty>
        ) : (
          <div className="divide-y">
            {apps.data.map((a) => {
              const p = profiles.data?.get(a.user_id);
              return (
                <div key={a.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">{p?.full_name ?? "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{p?.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.status === "pending" ? "secondary" : "outline"} className="capitalize">{a.status}</Badge>
                    {a.status !== "approved" && <Button size="sm" variant="accent" onClick={() => review(a.user_id, true)}>Approve</Button>}
                    {a.status === "pending" && <Button size="sm" variant="outline" onClick={() => review(a.user_id, false)}>Decline</Button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </DashboardShell>
  );
}
