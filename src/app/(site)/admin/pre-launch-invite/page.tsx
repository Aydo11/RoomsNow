import Link from "next/link";
import { requireAdmin } from "@/lib/rbac";
import { db } from "@/lib/db";
import { DashboardShell, DataTable } from "@/components/dashboard-shell";
import { PreLaunchInviteForm } from "@/components/marketing-forms";
import { AdminMembershipGrantForm } from "@/components/admin-membership-grant-form";
import { shortDate } from "@/lib/format";
import { adminNav } from "../nav";

export const metadata = { title: "Pre-launch mailshot" };
export const dynamic = "force-dynamic";

export default async function PreLaunchInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const nav = await adminNav();
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 100);
  const now = new Date();
  const providers = await db.company.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { tradingName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: q ? { name: "asc" } : { createdAt: "desc" },
    take: q ? 50 : 10,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      subscription: {
        select: { status: true, membership: { select: { name: true } } },
      },
      membershipGrants: {
        where: {
          revokedAt: null,
          startsAt: { lte: now },
          membership: { audience: "PROVIDER", tier: { in: ["PROFESSIONAL", "BUSINESS"] } },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { expiresAt: true, membership: { select: { name: true, tier: true } } },
      },
    },
  });
  return (
    <DashboardShell
      title="Pre-launch mailshot"
      subtitle="A hand-picked outreach mailshot to real Birmingham providers before public launch, offering 3 months of Professional free."
      nav={nav}
      active="/admin/pre-launch-invite"
    >
      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <PreLaunchInviteForm />
        <div className="card space-y-4 p-5">
          <h2 className="text-lg">What this sends</h2>
          <p className="text-sm text-ink-soft">
            A founder-voice invitation (signed with whatever name you enter, framed as someone
            with hands-on experience in the sector) covering: the cost of a void and how RoomsNow
            shortens it, sourced Birmingham and UK
            demand statistics, the pre-launch &ldquo;founding provider&rdquo; framing, and a free
            3-month Professional offer (worth &pound;147) so they can trial it before paying
            anything. One submission sends to every address you paste in, each as its own email
            (never a group BCC) &mdash; up to 150 at a time.
          </p>
          <div className="rounded-[10px] border border-line bg-paper-sunk/60 p-4 text-[13px] leading-relaxed text-ink-soft">
            <p className="font-medium text-ink">Fulfilling the offer</p>
            <p className="mt-1">
              This only sends the email &mdash; it doesn&apos;t touch billing. Once someone
              registers as a provider, find them below and grant Professional with a 3-month
              expiry, or open{" "}
              <Link href="/admin/memberships" className="text-pine-dark underline">
                Memberships
              </Link>{" "}
              for the full provider access table.
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

      <section className="mt-8">
        <h2 className="text-[20px]">Grant access</h2>
        <p className="mt-1 max-w-3xl text-[14px] text-ink-soft">
          Search for a provider who registered from this mailshot and grant them Professional or
          Business without recording a payment. Showing the 10 most recently registered providers
          by default.
        </p>
        <form className="mt-4 flex max-w-xl gap-2" method="get">
          <label className="sr-only" htmlFor="provider-search">Find a provider</label>
          <input
            id="provider-search"
            className="field"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search provider name or email"
          />
          <button className="btn-secondary" type="submit">Search</button>
        </form>
        <div className="mt-3">
          {providers.length === 0 ? (
            <p className="text-[14px] text-ink-faint">
              {q ? "No providers matched that search." : "No providers have registered yet."}
            </p>
          ) : (
            <DataTable head={["Provider", "Registered", "Paid plan", "Admin grant", ""]}>
              {providers.map((provider) => {
                const paid = provider.subscription && ["ACTIVE", "TRIALING", "PAST_DUE"].includes(provider.subscription.status)
                  ? provider.subscription.membership.name
                  : "Free";
                const grant = provider.membershipGrants[0];
                const expiresOn = grant?.expiresAt ? grant.expiresAt.toISOString().slice(0, 10) : null;
                return (
                  <tr key={provider.id}>
                    <td className="px-4 py-3 font-medium">
                      {provider.name}
                      <div className="text-[12px] font-normal text-ink-faint">{provider.email}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{shortDate(provider.createdAt)}</td>
                    <td className="px-4 py-3 text-ink-soft">{paid}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {grant ? `${grant.membership.name}${grant.expiresAt ? ` · ends ${shortDate(grant.expiresAt)}` : " · no expiry"}` : "—"}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <AdminMembershipGrantForm
                        companyId={provider.id}
                        currentGrant={grant ? {
                          tier: grant.membership.tier as "PROFESSIONAL" | "BUSINESS",
                          name: grant.membership.name,
                          expiresOn,
                        } : null}
                      />
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
