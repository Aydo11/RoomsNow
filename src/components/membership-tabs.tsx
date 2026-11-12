import Link from "next/link";
import { clsx } from "@/lib/clsx";

/** Switches between the membership plans and the Pro Services price list. */
export function MembershipTabs({ active }: { active: "plans" | "pro" }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link href={href} aria-current={on ? "page" : undefined} className={clsx("rounded-full px-4 py-2 text-[14px] font-semibold", on ? "bg-pine text-white" : "text-ink-soft hover:bg-paper-sunk")}>
      {label}
    </Link>
  );
  return (
    <nav aria-label="Membership sections" className="mb-6 inline-flex gap-1 rounded-full border border-line bg-white p-1">
      {tab("/provider/membership", "Plans & billing", active === "plans")}
      {tab("/provider/pro-services", "Pro Services pricing", active === "pro")}
    </nav>
  );
}

/** A quiet one-line pointer to Pro Services for the plans and pricing pages. */
export function ProServicesNudge({ className = "" }: { className?: string }) {
  return (
    <Link href="/provider/pro-services" className={clsx("group flex flex-wrap items-center justify-between gap-2 rounded-card border border-dashed border-pine/40 px-4 py-3 text-[14.5px] transition hover:border-pine hover:bg-pine-light/40", className)}>
      <span className="text-ink-soft">
        <strong className="text-ink">Want Pro Services?</strong> A staff CRM, a website for your service or 1:1 advice from our housing managers.
      </span>
      <span className="font-semibold text-pine-dark group-hover:underline">See Pro Services →</span>
    </Link>
  );
}
