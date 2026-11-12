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
