import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard-shell";
import { SeekerMailshotForm } from "@/components/seeker-mailshot-form";
import { seekerAudienceWhere, type SeekerAudience } from "@/lib/seeker-audience";
import { adminNav } from "../nav";

export const metadata = { title: "People mailshot" };
export const dynamic = "force-dynamic";

const AUDIENCES: Array<{ value: SeekerAudience; label: string; hint: string }> = [
  { value: "ALL", label: "Everyone looking", hint: "Every active account looking for a room with a confirmed email." },
  { value: "RECENT", label: "Joined in the last 30 days", hint: "Newer accounts who may not know everything RoomsNow does yet." },
  { value: "NO_ADVERT", label: "No “looking for” advert yet", hint: "People providers can't find yet. Good for nudging them to post one." },
];

/**
 * The "About RoomsNow" email to people looking for a room: who we are, what
 * we offer and how we connect them with the right room. New people get the
 * same email automatically when they confirm their address; this page sends
 * it to everyone who is already registered.
 */
export default async function SeekerMailshotPage({ searchParams }: { searchParams: Promise<{ audience?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  const audience = (AUDIENCES.find((item) => item.value === query.audience)?.value ?? "ALL") as SeekerAudience;

  const [nav, counts, welcomed] = await Promise.all([
    adminNav(),
    Promise.all(AUDIENCES.map((item) => db.user.count({ where: seekerAudienceWhere(item.value) }))),
    db.auditLog.count({ where: { action: "email.welcome_sent" } }),
  ]);
  const recipientCount = counts[AUDIENCES.findIndex((item) => item.value === audience)] ?? 0;

  return (
    <DashboardShell
      title="People mailshot"
      subtitle="Send the “About RoomsNow” email to people looking for a room: who we are, what we offer, and how we connect them with the right room."
      nav={nav}
      active="/admin/seeker-mailshot"
    >
      <div className="grid items-start gap-6 lg:grid-cols-[.85fr_1.15fr]">
        <div className="space-y-4">
          <div className="card p-4">
            <p className="text-sm font-semibold text-ink">Who gets it</p>
            <ul className="mt-3 space-y-2">
              {AUDIENCES.map((item, index) => {
                const selected = item.value === audience;
                return (
                  <li key={item.value}>
                    <Link
                      href={`/admin/seeker-mailshot?audience=${item.value}`}
                      aria-current={selected ? "true" : undefined}
                      className={`flex items-start justify-between gap-3 rounded-[10px] border p-3 transition-colors ${
                        selected ? "border-pine bg-pine/5" : "border-line hover:border-pine/40"
                      }`}
                    >
                      <span>
                        <span className="block text-[14px] font-medium text-ink">{item.label}</span>
                        <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-soft">{item.hint}</span>
                      </span>
                      <span className="shrink-0 rounded-pill bg-paper-sunk px-2.5 py-1 text-[12px] font-medium tabular-nums text-ink-soft">
                        {counts[index]}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="card space-y-2 p-4 text-[13px] leading-relaxed text-ink-soft">
            <p className="font-medium text-ink">New people get it automatically</p>
            <p>
              Everyone who signs up looking for a room receives this email as a welcome as soon as they
              confirm their email address, with a thank you and their first name. Sent so far:{" "}
              <strong className="tabular-nums text-ink">{welcomed}</strong>.
            </p>
            <p>
              Each person gets the welcome once. Providers and referrers don&apos;t get it; they have
              their own emails.
            </p>
          </div>
          <div className="card space-y-2 p-4 text-[13px] leading-relaxed text-ink-soft">
            <p className="font-medium text-ink">Sending from another tool?</p>
            <p>
              Download the finished HTML to paste into Mailchimp, Outlook or anywhere else. It keeps the
              Resend first-name and unsubscribe tags, so swap those for your tool&apos;s own.
            </p>
            <a href="/api/admin/seeker-mailshot/preview?download=1" className="btn-secondary mt-1 inline-flex">
              Download HTML
            </a>
          </div>
        </div>
        <SeekerMailshotForm audience={audience} recipientCount={recipientCount} />
      </div>
    </DashboardShell>
  );
}
