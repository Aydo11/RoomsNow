import Link from "next/link";
import { clsx } from "@/lib/clsx";

const TABS = [
  { href: "/admin/seeker-mailshot", label: "People looking", hint: "About RoomsNow email" },
  { href: "/admin/provider-mailshot", label: "Providers", hint: "Registered providers" },
  { href: "/admin/pre-launch-invite", label: "Invite new providers", hint: "Pre-launch outreach" },
] as const;

/** Switches between the three email campaigns, which share one menu entry. */
export function CampaignTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="Email campaigns" className="mb-5 overflow-x-auto">
      <ul className="flex min-w-max gap-1 rounded-[12px] border border-line bg-paper-sunk p-1">
        {TABS.map((tab) => {
          const current = tab.href === active;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={clsx(
                  "block rounded-[9px] px-4 py-2 text-left transition-colors",
                  current ? "bg-white shadow-raise" : "hover:bg-white/60",
                )}
              >
                <span className={clsx("block text-[14px] font-semibold", current ? "text-ink" : "text-ink-soft")}>{tab.label}</span>
                <span className="block text-[12px] text-ink-faint">{tab.hint}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
