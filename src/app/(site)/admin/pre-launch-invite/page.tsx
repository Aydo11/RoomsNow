import Link from "next/link";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { PreLaunchInviteForm } from "@/components/marketing-forms";
import { adminNav } from "../nav";

export const metadata = { title: "Pre-launch invite" };
export const dynamic = "force-dynamic";

export default async function PreLaunchInvitePage() {
  await requireAdmin();
  const nav = await adminNav();
  return (
    <DashboardShell
      title="Pre-launch invite"
      subtitle="A hand-picked outreach email to real Birmingham providers before public launch, offering 3 months of Professional free."
      nav={nav}
      active="/admin/pre-launch-invite"
    >
      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <PreLaunchInviteForm />
        <div className="card space-y-4 p-5">
          <h2 className="text-lg">What this sends</h2>
          <p className="text-sm text-ink-soft">
            A founder-voice invitation (signed with whatever name you enter, framed as one
            managing agent to another) covering: the cost of a void and how RoomsNow shortens it,
            sourced Birmingham and UK
            demand statistics, the pre-launch &ldquo;founding provider&rdquo; framing, and a free
            3-month Professional offer (worth &pound;147) so they can trial it before paying
            anything.
          </p>
          <div className="rounded-[10px] border border-line bg-paper-sunk/60 p-4 text-[13px] leading-relaxed text-ink-soft">
            <p className="font-medium text-ink">Fulfilling the offer</p>
            <p className="mt-1">
              This only sends the email &mdash; it doesn&apos;t touch billing. Once someone
              registers as a provider, open{" "}
              <Link href="/admin/memberships" className="text-pine-dark underline">
                Memberships
              </Link>{" "}
              and grant them Professional with a 3-month expiry from the provider access table.
            </p>
          </div>
          <div className="rounded-[10px] border border-line bg-paper-sunk/60 p-4 text-[13px] leading-relaxed text-ink-soft">
            <p className="font-medium text-ink">Sources cited in the email</p>
            <p className="mt-1">
              Birmingham exempt/supported accommodation claim numbers &mdash; Birmingham City
              Council. Temporary accommodation and prevention/relief duty figures &mdash; GOV.UK
              statutory homelessness statistics. Worth checking these aren&apos;t stale before a
              large send, since they update quarterly.
            </p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
