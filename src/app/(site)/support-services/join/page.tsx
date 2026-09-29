import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { SupportOrganisationForm } from "@/components/support-forms";

export const metadata = { title: "List your support service free", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

const BENEFITS = [
  ["Be found by the people who need you", "Tenants, people looking for housing and the providers who house them can find your service by area and type of support."],
  ["Post free training and events", "Share drug awareness sessions, drop-ins and service updates with residents and housing staff."],
  ["Free, checked listings", "Every listing is reviewed by our team, so people can trust the numbers and addresses they see."],
] as const;

export default async function JoinSupportDirectoryPage() {
  const user = await getCurrentUser();
  const isAdmin = Boolean(user && hasAdminPermission(user, "MODERATION"));
  if (user && !isAdmin) {
    const existing = await db.supportOrganisation.findUnique({ where: { ownerId: user.id }, select: { id: true } });
    if (existing) redirect("/support-services/manage");
  }

  return (
    <div className="shell max-w-4xl py-8 sm:py-12">
      <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-pine-dark">Support services</p>
      <h1 className="mt-1 text-balance text-[30px] leading-tight sm:text-[38px]">{isAdmin ? "Add a support service" : "List your support service free"}</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-ink-soft">
        For councils, charities, NHS teams and community organisations helping with mental health, drugs and alcohol, homelessness, domestic abuse, money and more.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-3">
        {BENEFITS.map(([title, body]) => (
          <li key={title} className="card p-4">
            <p className="font-semibold text-ink">{title}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{body}</p>
          </li>
        ))}
      </ul>

      {!user ? (
        <section className="card mt-8 p-6 text-center">
          <h2 className="text-[20px]">Sign in to add your service</h2>
          <p className="mx-auto mt-1 max-w-md text-[14px] text-ink-soft">Use your work email. One account runs your organisation&apos;s listing and posts.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/register?type=REFERRER" className="btn-primary">Create a free account</Link>
            <Link href="/login?next=/support-services/join" className="btn-secondary">Sign in</Link>
          </div>
        </section>
      ) : (
        <section className="card mt-8 p-5 sm:p-7">
          <h2 className="text-[20px]">Your organisation</h2>
          <p className="mt-1 text-[14px] text-ink-soft">
            {isAdmin ? "Listings you add as an admin go live straight away." : "Our team checks new listings, usually within a working day. You can add locations and posts straight after."}
          </p>
          <div className="mt-5"><SupportOrganisationForm isAdmin={isAdmin} /></div>
        </section>
      )}
    </div>
  );
}
