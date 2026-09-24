import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { findInvite, ORG_ROLE_LABEL } from "@/lib/referral-team";
import { AcceptInviteButton, JoinWithNewAccountForm } from "@/components/join-organisation";

export const metadata = { title: "Join your organisation", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function JoinOrganisationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invite, user] = await Promise.all([findInvite(token), getCurrentUser()]);

  if (!invite) {
    return (
      <div className="shell max-w-xl py-16">
        <div className="card px-6 py-10 text-center">
          <h1 className="text-[24px]">This invitation can&apos;t be used</h1>
          <p className="mx-auto mt-2 max-w-[45ch] text-[15px] text-ink-soft">
            It may have expired, been cancelled, or already been accepted. Ask your colleague to send a new one from their Team page.
          </p>
          <Link href={user ? "/referrals" : "/login"} className="btn-primary mt-5">{user ? "Go to your dashboard" : "Sign in"}</Link>
        </div>
      </div>
    );
  }

  const inviter = `${invite.invitedBy.firstName} ${invite.invitedBy.lastName}`;
  const existing = user ? null : await db.user.findUnique({ where: { email: invite.email }, select: { id: true } });
  const matches = user && user.email.toLowerCase() === invite.email.toLowerCase();

  return (
    <div className="shell max-w-xl py-12">
      <div className="card p-6 sm:p-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-pine-dark">Team invitation</p>
        <h1 className="mt-2 text-[28px] leading-tight">Join {invite.organisation.name}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          {inviter} has invited <strong className="font-medium text-ink">{invite.email}</strong> to join as{" "}
          {invite.role === "ADMIN" ? "an admin" : "a member"} ({ORG_ROLE_LABEL[invite.role].toLowerCase()}). You&apos;ll have your own
          login and profile, and share your team&apos;s clients and referrals.
        </p>

        <div className="mt-6">
          {user ? (
            matches ? (
              <AcceptInviteButton token={token} orgName={invite.organisation.name} />
            ) : (
              <p className="rounded-[10px] bg-paper-sunk px-4 py-3 text-[14px] text-ink-soft">
                You&apos;re signed in as {user.email}. Sign out and sign in as {invite.email} to accept this invitation.
              </p>
            )
          ) : existing ? (
            <div className="space-y-3">
              <p className="text-[14px] text-ink-soft">You already have a RoomsNow account with this email.</p>
              <Link href={`/login?next=${encodeURIComponent(`/join/${token}`)}`} className="btn-primary">Sign in to accept</Link>
            </div>
          ) : (
            <JoinWithNewAccountForm token={token} email={invite.email} />
          )}
        </div>
      </div>
    </div>
  );
}
