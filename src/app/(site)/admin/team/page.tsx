import { requireAdmin } from "@/lib/rbac";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard-shell";
import { CreateTeamForm, ResetTwoStepForm, TeamAccessForm } from "@/components/team-forms";
import { adminNav } from "../nav";

export const dynamic = "force-dynamic";
export default async function TeamPage() {
  const actor = await requireAdmin();
  const [nav, users] = await Promise.all([adminNav(), db.user.findMany({
    where: { role: "ADMIN", deletedAt: null }, orderBy: { createdAt: "asc" }, take: 100,
    select: { id: true, firstName: true, lastName: true, email: true, adminPermissions: true, status: true, totpEnabledAt: true },
  })]);
  return <DashboardShell title="Team & permissions" subtitle="Add administrators and moderators, give everyone their own verified login, and change or suspend access at any time." nav={nav} active="/admin/team">
    <div className="grid items-start gap-6 xl:grid-cols-2"><CreateTeamForm /><section className="space-y-3" aria-label="Team members">
      {users.map((user) => <article key={user.id} className="card p-5">
        <h2 className="text-lg">{user.firstName} {user.lastName}{user.id === actor.id ? " (you)" : ""}</h2>
        <p className="break-all text-sm text-ink-soft">{user.email}</p>
        <p className="mt-2 text-sm">{user.adminPermissions.includes("ALL") ? "Full administrator" : "Moderator"} · {user.status.toLowerCase()} · {user.totpEnabledAt ? "two-step login on" : "two-step login not set up"}</p>
        {user.id !== actor.id && <TeamAccessForm userId={user.id} permission={user.adminPermissions.includes("ALL") ? "ALL" : "MODERATION"} status={user.status} />}
        {user.id !== actor.id && user.totpEnabledAt && <ResetTwoStepForm userId={user.id} />}
      </article>)}
    </section></div>
  </DashboardShell>;
}
