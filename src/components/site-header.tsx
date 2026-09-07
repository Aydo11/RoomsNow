import Link from "next/link";
import { MobileMenu } from "./mobile-menu";
import { brand } from "@/brand.config";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { logoutAction } from "@/server/actions/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const unread = user
    ? await db.notification.count({ where: { userId: user.id, readAt: null } })
    : 0;

  const home =
    user?.role === "ADMIN" ? "/admin" : user?.role === "PROVIDER" ? "/provider" : user?.role === "REFERRER" ? "/referrals" : "/dashboard";

  return (
    <header className="sticky top-0 z-40 border-b border-line/90 bg-paper/90 backdrop-blur-lg">
      <div className="shell flex h-16 items-center gap-4 xl:gap-6">
        <Link href="/" className="flex shrink-0 items-center" aria-label={`${brand.name} home`}>
          <Logo className="h-10 w-auto max-w-[158px] sm:h-11 sm:max-w-[180px]" />
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-5 whitespace-nowrap text-[14px] text-ink-soft xl:flex">
          <Link href="/hmo-rooms" className="transition-colors hover:text-ink">HMO rooms</Link>
          <Link href="/supported-accommodation" className="transition-colors hover:text-ink">Supported accommodation</Link>
          <Link href="/how-it-works" className="transition-colors hover:text-ink">How it works</Link>
          <Link href="/advertise-accommodation" className="transition-colors hover:text-ink">Advertise</Link>
          <Link href="/pricing" className="transition-colors hover:text-ink">Membership</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link href="/messages" className="btn-ghost hidden whitespace-nowrap xl:inline-flex">Messages</Link>
              <Link href={`${home}`} className="btn-secondary hidden whitespace-nowrap xl:inline-flex">
                Dashboard
                {unread > 0 && (
                  <span className="ml-1 rounded-pill bg-pine px-1.5 py-0.5 text-[11px] font-semibold text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <form action={logoutAction}>
                <button className="btn-ghost hidden whitespace-nowrap xl:inline-flex">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost hidden whitespace-nowrap xl:inline-flex">Sign in</Link>
              <Link href="/register" className="btn-primary hidden whitespace-nowrap xl:inline-flex">Create account</Link>
            </>
          )}

          <MobileMenu>
              <MobileLink href="/hmo-rooms">HMO rooms</MobileLink>
              <MobileLink href="/supported-accommodation">Supported accommodation</MobileLink>
              <MobileLink href="/search">Search all accommodation</MobileLink>
              <MobileLink href="/how-it-works">How it works</MobileLink>
              <MobileLink href="/people">People looking</MobileLink>
              <MobileLink href="/advertise-accommodation">Advertise</MobileLink>
              <MobileLink href="/pricing">Membership</MobileLink>
              <div className="my-2 border-t border-line" />
              {user ? (
                <>
                  <MobileLink href={home}>Dashboard{unread > 0 ? ` (${unread})` : ""}</MobileLink>
                  <MobileLink href="/messages">Messages</MobileLink>
                  <form action={logoutAction}>
                    <button className="w-full rounded-[9px] px-3 py-3 text-left text-[15px] text-ink-soft hover:bg-paper-sunk">Sign out</button>
                  </form>
                </>
              ) : (
                <>
                  <MobileLink href="/login">Sign in</MobileLink>
                  <MobileLink href="/register">Create account</MobileLink>
                </>
              )}
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}

function MobileLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="block rounded-[9px] px-3 py-3 text-[15px] text-ink-soft hover:bg-paper-sunk hover:text-ink">{children}</Link>;
}

export function Logo({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <img src="/brand/roomsnow-logo-fullcolor.svg" alt="" aria-hidden="true" className={className} />
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-white">
      <div className="shell grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="inline-flex items-center" aria-label={`${brand.name} home`}>
            <Logo className="h-11 w-auto max-w-[185px]" />
          </Link>
          <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-ink-soft">{brand.description}</p>
        </div>
        <FooterColumn
          title="Looking for a home"
          links={[
            ["HMO rooms to rent", "/hmo-rooms"],
            ["Supported accommodation", "/supported-accommodation"],
            ["Transitional accommodation", "/transitional-accommodation"],
            ["Search all accommodation", "/search"],
            ["Post what you're looking for", "/dashboard/advert"],
            ["How it works", "/how-it-works"],
            ["Staying safe", "/safety"],
          ]}
        />
        <FooterColumn
          title="Providers"
          links={[
            ["Advertise accommodation", "/advertise-accommodation"],
            ["Membership and pricing", "/pricing"],
            ["Find people looking", "/people"],
            ["Get verified", "/verification"],
          ]}
        />
        <FooterColumn
          title="Professionals"
          links={[
            ["Accommodation referrals", "/accommodation-referrals"],
            ["Referrer accounts", "/register?type=REFERRER"],
            ["Privacy", "/privacy"],
            ["Terms", "/terms"],
          ]}
        />
      </div>
      <div className="border-t border-line">
        <div className="shell flex flex-col gap-2 py-6 text-[13px] text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
          <p className="max-w-xl">{brand.trustNote}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="text-[15px] font-medium text-ink">{title}</h4>
      <ul className="mt-3 space-y-2 text-[14px] text-ink-soft">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="hover:text-pine-dark">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
