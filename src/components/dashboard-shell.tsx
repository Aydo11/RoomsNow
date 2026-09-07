import Link from "next/link";
import { clsx } from "@/lib/clsx";

export type NavItem = { href: string; label: string; badge?: number };

export function DashboardShell({
  title,
  subtitle,
  nav,
  active,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  nav: NavItem[];
  active: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const activeItem = nav.find((item) => item.href === active);

  const navLinks = nav.map((item) => (
    <li key={item.href}>
      <Link
        href={item.href}
        aria-current={item.href === active ? "page" : undefined}
        className={clsx(
          "flex min-h-11 items-center justify-between gap-2 rounded-[10px] px-3.5 py-2.5 text-[14px] leading-tight sm:text-[15px] lg:whitespace-nowrap",
          item.href === active ? "bg-ink text-white" : "text-ink-soft hover:bg-paper-sunk hover:text-ink",
        )}
      >
        {item.label}
        {item.badge ? (
          <span
            className={clsx(
              "rounded-pill px-1.5 py-0.5 text-[11px] font-semibold",
              item.href === active ? "bg-white/20 text-white" : "bg-pine-light text-pine-dark",
            )}
          >
            {item.badge}
          </span>
        ) : null}
      </Link>
    </li>
  ));

  return (
    <div className="shell grid min-w-0 gap-5 py-4 sm:py-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 lg:py-8">
      <nav aria-label="Dashboard" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <details className="group lg:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-[12px] border border-line bg-white px-4 py-3 font-semibold text-ink shadow-raise marker:hidden">
            <span className="min-w-0 truncate">{activeItem?.label ?? "Dashboard"}</span>
            <span className="ml-3 flex shrink-0 items-center gap-2 text-[13px] font-medium text-pine-dark">
              Menu
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </summary>
          <ul className="mt-2 grid grid-cols-2 gap-1 rounded-[12px] border border-line bg-white p-2 shadow-raise">
            {navLinks}
          </ul>
        </details>
        <ul className="hidden space-y-0.5 lg:block">{navLinks}</ul>
      </nav>

      <div className="min-w-0">
        <header className="mb-5 flex min-w-0 flex-wrap items-start justify-between gap-3 sm:mb-6 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-[24px] leading-tight sm:text-[28px]">{title}</h1>
            {subtitle && <p className="mt-1 max-w-[65ch] text-[14px] leading-relaxed text-ink-soft sm:text-[15px]">{subtitle}</p>}
          </div>
          {action && (
            <div className="w-full sm:w-auto [&_a]:w-full [&_button]:w-full sm:[&_a]:w-auto sm:[&_button]:w-auto">
              {action}
            </div>
          )}
        </header>
        {children}
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint, compact = false, className }: { label: string; value: string | number; hint?: string; compact?: boolean; className?: string }) {
  return (
    <div className={clsx("card min-w-0", compact ? "p-3.5" : "p-4 sm:p-5", className)}>
      <p className="text-[13px] text-ink-faint">{label}</p>
      <p className={clsx("mt-1 break-words font-display leading-none", compact ? "text-[22px] sm:text-[24px]" : "text-[25px] sm:text-[30px]")}>{value}</p>
      {hint && <p className={clsx("text-[13px] text-ink-soft", compact ? "mt-1" : "mt-2")}>{hint}</p>}
    </div>
  );
}

export function MetricBar({ label, value, total, tone = "bg-pine" }: { label: string; value: number; total: number; tone?: string }) {
  const width = total > 0 ? Math.max(3, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-4 text-[13px]">
        <span className="text-ink-soft">{label}</span><span className="font-semibold text-ink">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-paper-sunk" aria-hidden="true">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function DataTable({
  head,
  children,
  compact = false,
}: {
  head: string[];
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="max-w-full min-w-0">
      <p className="mb-2 text-[12px] text-ink-faint sm:hidden">Swipe sideways to see all columns</p>
      <div className="card max-w-full overflow-x-auto overscroll-x-contain">
        <table className={clsx("w-full min-w-[640px] text-left", compact ? "text-[13px] [&_td]:px-3 [&_td]:py-2 [&_td_.btn]:min-h-8 [&_td_.btn]:px-2.5 [&_td_.btn]:py-1 [&_td_.btn]:text-[13px]" : "text-[14px]")}>
          <thead className="border-b border-line text-[13px] text-ink-faint">
            <tr>
              {head.map((cell) => (
                <th key={cell} scope="col" className={clsx("font-medium", compact ? "px-3 py-2" : "px-4 py-3")}>{cell}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">{children}</tbody>
        </table>
      </div>
    </div>
  );
}
