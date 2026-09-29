import Link from "next/link";
import { MobileMenu } from "./mobile-menu";
import { brand } from "@/brand.config";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { logoutAction } from "@/server/actions/auth";
import { LanguageSelector } from "./language-selector";
import { ThemeToggle } from "./theme-toggle";
import { CookieSettingsButton } from "@/components/cookie-settings-button";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const unread = user
    ? await db.notification.count({ where: { userId: user.id, readAt: null } })
    : 0;

  const home =
    user?.role === "ADMIN" ? "/admin" : user?.role === "PROVIDER" ? "/provider" : user?.role === "REFERRER" ? "/referrals" : user?.role === "SERVICE_PROVIDER" ? "/service-provider" : "/dashboard";
  // Vetted (CQC/BVSC-checked) providers are public; referrers keep their workspace copy.
  const vettedHref = user?.role === "REFERRER" ? "/referrals/vetted" : "/vetted-providers";
  // Provider Services: paid providers browse it, free providers see a preview and
  // everyone else lands on the explainer. Service businesses manage their own area.
  const isServiceBusiness = user?.role === "SERVICE_PROVIDER";

  return (
    <header className="site-header sticky top-0 z-40 border-b border-line/90 bg-paper/90 backdrop-blur-lg">
      <div className="shell flex h-16 items-center gap-4 xl:gap-6">
        <Link href="/" className="flex shrink-0 items-center" aria-label={`${brand.name} home`}>
          <Logo className="h-10 w-auto max-w-[158px] sm:h-11 sm:max-w-[180px]" />
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-4 whitespace-nowrap text-[13.5px] text-ink-soft xl:flex 2xl:gap-5 2xl:text-[14px]">
          <Link href="/search" className="font-medium text-pine-dark transition-colors hover:text-ink">Search rooms</Link>
          {user?.role !== "SERVICE_PROVIDER" && (
            <Link href={vettedHref} className="inline-flex items-center gap-1 font-medium text-pine-dark transition-colors hover:text-ink">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true" fill="currentColor">
                <path d="M8 0 9.9 1.4l2.3-.2.7 2.2 1.9 1.3-.9 2.2.9 2.2-1.9 1.3-.7 2.2-2.3-.2L8 14l-1.9-1.4-2.3.2-.7-2.2L1.2 9.3l.9-2.2-.9-2.2 1.9-1.3.7-2.2 2.3.2L8 0Zm3.2 5.3-.9-.9-3.4 3.4-1.5-1.5-.9.9 2.4 2.4 4.3-4.3Z" />
              </svg>
              Vetted providers
            </Link>
          )}
          {isServiceBusiness ? (
            <Link href="/service-provider/adverts" className="font-medium text-pine-dark transition-colors hover:text-ink">My service adverts</Link>
          ) : (
            <Link href="/services" className="font-medium text-pine-dark transition-colors hover:text-ink">Provider Services</Link>
          )}
          <Link href="/support-services" className="transition-colors hover:text-ink">Support services</Link>
          <Link href="/people" className="hidden transition-colors hover:text-ink 2xl:inline">People looking</Link>
          <Link href="/advertise-accommodation" className="transition-colors hover:text-ink">Advertise</Link>
          <Link href="/pricing" className={user ? "hidden transition-colors hover:text-ink 2xl:inline" : "transition-colors hover:text-ink"}>Membership</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle compact />
          {user ? (
            <>
              <Link href="/messages" className="btn-ghost hidden whitespace-nowrap 2xl:inline-flex">Messages</Link>
              <Link href={`${home}`} className="btn-secondary hidden whitespace-nowrap xl:inline-flex">
                Dashboard
                {unread > 0 && (
                  <span className="ml-1 rounded-pill bg-pine px-1.5 py-0.5 text-[11px] font-semibold text-white">
                    {unread}
                  </span>
                )}
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost hidden whitespace-nowrap xl:inline-flex">Sign in</Link>
              <Link href="/register" className="btn-primary hidden whitespace-nowrap xl:inline-flex">Sign up</Link>
            </>
          )}

          <MobileMenu>
            {user ? (
              <div className="mb-3 grid grid-cols-2 gap-2">
                <Link href={home} className="btn-primary justify-center">
                  Dashboard
                  {unread > 0 && <span className="ml-1 rounded-pill bg-white/20 px-1.5 py-0.5 text-[11px] font-semibold">{unread}</span>}
                </Link>
                <Link href="/messages" className="btn-secondary justify-center">Messages</Link>
              </div>
            ) : (
              <div className="mb-3 grid grid-cols-2 gap-2">
                <Link href="/register" className="btn-primary justify-center">Create account</Link>
                <Link href="/login" className="btn-secondary justify-center">Sign in</Link>
              </div>
            )}

            <MobileSection title="Find accommodation">
              <MobileLink href="/search" icon="search" hint="Rooms and supported housing near you">Search accommodation</MobileLink>
              <MobileLink href={vettedHref} icon="badge" hint="Rooms from CQC or BVSC-checked providers">Vetted providers</MobileLink>
              <MobileLink href="/support-services" icon="heart" hint="Mental health, drugs and alcohol, housing help and crisis lines">Support services</MobileLink>
              <MobileLink href="/how-it-works" icon="info">How it works</MobileLink>
            </MobileSection>

            {isServiceBusiness ? (
              <MobileSection title="Your business">
                <MobileLink href="/service-provider" icon="home" hint="Plan, verification and activity">Business dashboard</MobileLink>
                <MobileLink href="/service-provider/adverts" icon="megaphone" hint="Create and manage your service adverts">My adverts</MobileLink>
                <MobileLink href="/service-provider/quotes" icon="quote">Quote requests</MobileLink>
                <MobileLink href="/service-provider/plan" icon="spark">Plan and boosts</MobileLink>
              </MobileSection>
            ) : (
              <>
                <MobileSection title="Accommodation providers">
                  <MobileLink href="/services" icon="tools" hint="Checked trades and suppliers for your homes" highlight>Provider Services</MobileLink>
                  <MobileLink href="/advertise-accommodation" icon="megaphone" hint="List rooms and vacancies">Advertise accommodation</MobileLink>
                  <MobileLink href="/people" icon="people" hint="People and referrers looking for a room">People looking</MobileLink>
                  <MobileLink href="/pricing" icon="spark">Membership and pricing</MobileLink>
                </MobileSection>
                <MobileSection title="Trades and suppliers">
                  <MobileLink href="/advertise-services" icon="tools" hint="Reach housing providers who need your services">Advertise your services</MobileLink>
                </MobileSection>
              </>
            )}

            <MobileSection title="Settings">
              <ThemeToggle />
              <LanguageSelector mobile />
              {user && (
                <form action={logoutAction}>
                  <button className="w-full rounded-[10px] px-3 py-3 text-left text-[15px] text-ink-soft hover:bg-paper-sunk">Sign out</button>
                </form>
              )}
            </MobileSection>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}

function MobileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-3 first:border-t-0">
      <h2 className="px-3 pb-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{title}</h2>
      <div className="grid gap-0.5">{children}</div>
    </section>
  );
}

const MENU_ICONS = {
  search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.2-4.2" /></>,
  badge: <path d="M12 3 14.4 5l3-.3.9 2.9 2.5 1.8-1.2 2.8 1.2 2.8-2.5 1.8-.9 2.9-3-.3L12 21l-2.4-2-3 .3-.9-2.9L3.2 14.6 4.4 12 3.2 9.2l2.5-1.8.9-2.9 3 .3L12 3Zm-3 9 2 2 4-4" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  home: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4v-9Z" />,
  megaphone: <path d="M4 10v4h3l7 4V6L7 10H4Zm13-1a4 4 0 0 1 0 6" />,
  quote: <path d="M5 5h14v10H9l-4 4V5Zm4 4h6M9 12h4" />,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />,
  tools: <path d="M14.5 5.5a4 4 0 0 0-5.3 5L4 15.7 8.3 20l5.2-5.2a4 4 0 0 0 5-5.3l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z" />,
  heart: <path d="M12 20s-7-4.4-7-9.4A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.6c0 5-7 9.4-7 9.4Z" />,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.5M17.5 14a5 5 0 0 1 3 5" /></>,
} as const;

function MobileLink({ href, icon, hint, highlight = false, children }: { href: string; icon: keyof typeof MENU_ICONS; hint?: string; highlight?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition-colors hover:bg-paper-sunk ${highlight ? "bg-pine-light/60" : ""}`}
    >
      <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-paper-sunk text-pine-dark">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{MENU_ICONS[icon]}</svg>
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-ink">{children}</span>
        {hint && <span className="block text-[12.5px] leading-snug text-ink-faint">{hint}</span>}
      </span>
    </Link>
  );
}

export function Logo({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <>
      {/* The dark-ink wordmark disappears on the dark theme, so swap in the white one there. */}
      <img src="/brand/roomsnow-logo-fullcolor.svg" alt="" aria-hidden="true" className={`${className} [html[data-theme=dark]_&]:hidden`} />
      <img src="/brand/roomsnow-logo-white.svg" alt="" aria-hidden="true" className={`${className} hidden [html[data-theme=dark]_&]:inline`} />
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer mt-20 border-t border-line bg-white">
      <div className="shell grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="inline-flex items-center" aria-label={`${brand.name} home`}>
            <Logo className="h-11 w-auto max-w-[185px]" />
          </Link>
          <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-ink-soft">{brand.description}</p>
          <div className="mt-4 max-w-xs"><LanguageSelector /></div>
        </div>
        <FooterColumn
          title="Looking for a home"
          links={[
            ["HMO rooms to rent", "/hmo-rooms"],
            ["Supported accommodation", "/supported-accommodation"],
            ["Supported housing by area", "/supported-housing"],
            ["Transitional accommodation", "/transitional-accommodation"],
            ["Adult social care accommodation", "/adult-social-care-accommodation"],
            ["Search all accommodation", "/search"],
            ["Vetted providers", "/vetted-providers"],
            ["Post what you're looking for", "/dashboard/advert"],
            ["How it works", "/how-it-works"],
            ["What happens after you apply", "/next-steps"],
            ["Room and referral guides", "/guides"],
            ["Staying safe", "/safety"],
            ["Support services and helplines", "/support-services"],
          ]}
        />
        <FooterColumn
          title="Providers"
          links={[
            ["Advertise accommodation", "/advertise-accommodation"],
            ["Membership and pricing", "/pricing"],
            ["Find people looking", "/people"],
            ["Get verified", "/verification"],
            ["Provider Services", "/services"],
            ["Advertise your services (trades)", "/advertise-services"],
            ["List a support service free", "/support-services/join"],
          ]}
        />
        <FooterColumn
          title="Professionals"
          links={[
            ["Accommodation referrals", "/accommodation-referrals"],
            ["Referrer accounts", "/register?type=REFERRER"],
            ["Send feedback", "/feedback"],
            ["Privacy", "/privacy"],
            ["Terms", "/terms"],
          ]}
        />
      </div>
      <div className="border-t border-line">
        <div className="shell flex flex-col gap-2 py-6 text-[13px] text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
          <p className="max-w-xl">{brand.trustNote}</p>
          <CookieSettingsButton />
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
