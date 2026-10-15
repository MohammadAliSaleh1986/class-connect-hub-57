import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardShell } from "@/components/DashboardShell";
import { fetchMe, homeFor } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/student")({
  beforeLoad: async () => {
    const me = await fetchMe();
    if (!me) throw redirect({ to: "/auth", search: { as: "student", mode: "signin" } });
    if (!me.roles.includes("student")) throw redirect({ to: homeFor(me) });
    return { me };
  },
  component: StudentLayout,
});

function StudentLayout() {
  const { me } = Route.useRouteContext();
  return (
    <DashboardShell area="student" me={me}>
      <Outlet />
    </DashboardShell>
  );
}
