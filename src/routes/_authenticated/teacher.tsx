import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardShell } from "@/components/DashboardShell";
import { fetchMe, homeFor } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/teacher")({
  beforeLoad: async () => {
    const me = await fetchMe();
    if (!me) throw redirect({ to: "/auth", search: { as: "teacher", mode: "signin" } });
    if (!me.roles.includes("teacher")) throw redirect({ to: homeFor(me) });
    return { me };
  },
  component: TeacherLayout,
});

function TeacherLayout() {
  const { me } = Route.useRouteContext();
  return (
    <DashboardShell area="teacher" me={me}>
      <Outlet />
    </DashboardShell>
  );
}
