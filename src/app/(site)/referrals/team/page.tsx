/* eslint-disable @next/next/no-img-element -- avatars may be local uploads or R2 */
import Link from "next/link";
import { db } from "@/lib/db";
import { requireReferrer } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { FormSuccess } from "@/components/ui";
import {
  CreateOrganisationForm,
  InviteColleagueForm,
  LeaveOrganisationButton,
  MemberControls,
  RenameOrganisationForm,
  RevokeInviteButton,
} from "@/components/referral-team-forms";
import { ORG_ROLE_LABEL, teamFor } from "@/lib/referral-team";
import { shortDate, timeAgo } from "@/lib/format";
import { referrerNav } from "../nav";

export const metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function ReferralTeamPage({ searchParams }: { searchParams: Promise<{ joined?: string }> }) {
  const [user, query] = await Promise.all([requireReferrer(), searchParams]);
  const [nav, team] = await Promise.all([referrerNav(user.id), teamFor(user.id)]);

  if (!team.organisation) {
    return (
      <DashboardShell
        title="Team"
        subtitle="Work with colleagues from one organisation — each with their own login and profile, sharing one caseload."
        nav={nav}
        active="/referrals/team"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="card p-6">
            <h2 className="text-[20px]">Set up your organisation</h2>
            <p className="mt-1 max-w-[60ch] text-[14px] leading-relaxed text-ink-soft">
              You&apos;ll be the owner. Invite colleagues by email — they get their own login, and everyone sees and works on the
              same clients and referrals. Your plan covers the whole team.
            </p>
            <div className="mt-5 max-w-lg">
              <CreateOrganisationForm suggestedName={user.organisation ?? ""} />
            </div>
          </section>
          <aside className="card space-y-3 p-5 text-[14px] leading-relaxed text-ink-soft">
            <h2 className="text-[16px] text-ink">How teams work</h2>
            <p><strong className="font-medium text-ink">Own logins.</strong> No shared passwords — everyone signs in as themselves, with their own name, photo and job title.</p>
            <p><strong className="font-medium text-ink">One caseload.</strong> Clients and referrals are visible to the whole team, with a case owner on each, so cover is easy when someone is away.</p>
            <p><strong className="font-medium text-ink">One agency profile and plan.</strong> Owners and admins manage the agency page and billing; client limits are pooled.</p>
            <p>Been invited by a colleague? Open the link in your invitation email.</p>
          </aside>
        </div>
      </DashboardShell>
    );
  }

  const org = await db.referralOrganisation.findUnique({
    where: { id: team.organisation.id },
    include: {
      members: {
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              jobTitle: true,
              avatarUrl: true,
              lastLoginAt: true,
              _count: { select: { clients: { where: { deletedAt: null, status: { not: "ARCHIVED" } } }, referralsMade: true } },
            },
          },
        },
      },
      invites: {
        where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        include: { invitedBy: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  if (!org) return null;

  return (
    <DashboardShell
      title={org.name}
      subtitle={`${org.members.length} ${org.members.length === 1 ? "person" : "people"} · one shared caseload · you're ${team.role === "OWNER" ? "the owner" : `an ${ORG_ROLE_LABEL[team.role!].toLowerCase()}`}`}
      nav={nav}
      active="/referrals/team"
      action={<Link href="/referrals/profile" className="btn-secondary">Agency profile</Link>}
    >
      {query.joined && (
        <div className="mb-5">
          <FormSuccess message={`Welcome to ${org.name}. You can now see and work on your team's clients and referrals.`} />
        </div>
      )}

      <div className="space-y-6">
        {team.canManage && (
          <section className="card space-y-4 p-6">
            <div>
              <h2 className="text-[20px]">Invite a colleague</h2>
              <p className="mt-1 text-[14px] text-ink-soft">
                They&apos;ll get an email to set up their own login. Admins can invite and manage people; members work on the caseload.
              </p>
            </div>
            <InviteColleagueForm />
          </section>
        )}

        <section className="card overflow-hidden">
          <h2 className="px-6 pt-5 text-[20px]">People</h2>
          <ul className="mt-3 divide-y divide-line">
            {org.members.map((member) => {
              const person = member.user;
              const name = `${person.firstName} ${person.lastName}`;
              const isSelf = person.id === user.id;
              return (
                <li key={member.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                  {person.avatarUrl ? (
                    <img src={person.avatarUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper-sunk text-[14px] font-medium text-ink-soft">
                      {`${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-ink">
                      {name}
                      {isSelf && <span className="font-normal text-ink-faint"> (you)</span>}
                    </p>
                    <p className="truncate text-[13px] text-ink-faint">
                      {[person.jobTitle, person.email].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-[12px] text-ink-faint">
                      {person._count.clients} active client{person._count.clients === 1 ? "" : "s"} · {person._count.referralsMade} referral{person._count.referralsMade === 1 ? "" : "s"}
                      {person.lastLoginAt ? ` · last signed in ${timeAgo(person.lastLoginAt)}` : ""}
                    </p>
                  </div>
                  {member.role === "OWNER" || !team.canManage || isSelf ? (
                    <span className="chip text-[12px]">{ORG_ROLE_LABEL[member.role]}</span>
                  ) : (
                    <MemberControls userId={person.id} role={member.role as "ADMIN" | "MEMBER"} name={name} />
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {team.canManage && org.invites.length > 0 && (
          <section className="card overflow-hidden">
            <h2 className="px-6 pt-5 text-[18px]">Waiting to join</h2>
            <ul className="mt-3 divide-y divide-line">
              {org.invites.map((invite) => (
                <li key={invite.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                  <div className="min-w-0 flex-1 basis-[15rem]">
                    <p className="truncate text-[14px] text-ink">{invite.email}</p>
                    <p className="text-[12px] text-ink-faint">
                      {ORG_ROLE_LABEL[invite.role]} · invited by {invite.invitedBy.firstName} {invite.invitedBy.lastName} {timeAgo(invite.createdAt)} · expires {shortDate(invite.expiresAt)}
                    </p>
                  </div>
                  <RevokeInviteButton inviteId={invite.id} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card grid gap-5 p-6 sm:grid-cols-2">
          {team.canManage ? (
            <RenameOrganisationForm name={org.name} />
          ) : (
            <p className="text-[14px] text-ink-soft">Owners and admins manage the team, the agency profile and the plan.</p>
          )}
          {team.role !== "OWNER" && (
            <div className="sm:justify-self-end">
              <LeaveOrganisationButton orgName={org.name} />
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
