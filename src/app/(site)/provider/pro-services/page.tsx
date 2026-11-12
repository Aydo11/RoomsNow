import Link from "next/link";
import { db } from "@/lib/db";
import { requireCompany, requireUser } from "@/lib/rbac";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { adminNav } from "../../admin/nav";
import { planLimits } from "@/lib/billing";
import { clsx } from "@/lib/clsx";
import { money, shortDate } from "@/lib/format";
import { DashboardShell, DataTable } from "@/components/dashboard-shell";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";
import { MembershipTabs } from "@/components/membership-tabs";
import { ProDemo } from "@/components/pro-demo";
import { providerNav } from "../nav";
import { proServiceEnquiryAction } from "@/server/actions/pro-services";
import { DEMO_SLUG, DEMO_STORIES, MEETING_TYPES, TIME_WINDOWS, ukMeetingTime, EXPERT_PLANS, PRO_SERVICES, PRO_SERVICE_KEYS, SESSION_HOURS, SESSION_STEPS, canUseProServices, sessionLabel, sessionPrice, type ProService, type ProServiceKey } from "@/lib/pro-services";

export const metadata = { title: "Pro Services" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  plan: "Pro Services are part of Professional and Business memberships. Upgrade to send an enquiry.",
  busy: "You've sent several enquiries in the last hour. Please try again a bit later, or email info@roomsnow.co.uk.",
  service: "Choose a service to enquire about.",
  meeting: "Choose a weekday between tomorrow and 60 days ahead for your call, or leave the date blank and we'll suggest one.",
};

/** 24px outline icons, drawn with the current text colour. */
const ICONS = {
  crm: "M4 5h16v14H4zM4 10h16M9 10v9M12 14h5M12 17h3",
  bespoke: "M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6",
  website: "M3 5h18v14H3zM3 9h18M6.5 7h.01M9 7h.01M7 13h6M7 16h10",
  expert: "M4 5h11v8H8l-4 3zM15 9h5v8l-3-2h-6v-2",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z",
  video: "M3 7h12v10H3zM15 11l6-3v8l-6-3",
  calendar: "M4 6h16v14H4zM4 10h16M8 4v4M16 4v4M8 14h3M13 14h3M8 17h3",
  message: "M4 5h16v11H9l-5 4zM8 9h8M8 12h5",
  check: "M5 12.5l4.5 4.5L19 7",
  inbox: "M4 13l2.5-8h11L20 13v6H4zM4 13h5l1 2h4l1-2h5",
  reply: "M10 8L5 12l5 4M5 12h9a5 5 0 0 1 5 5v1",
  rocket: "M14 4c3 0 6 3 6 6l-7 7-6-6 7-7ZM7 11l-3 1 2 2M13 17l-1 3-2-2M14.5 9.5h.01",
} as const;

function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

const SERVICE_ICON: Record<ProServiceKey, keyof typeof ICONS> = { CRM: "crm", BESPOKE_CRM: "bespoke", WEBSITE: "website", EXPERT: "expert" };
const STARTS_AT: Record<ProServiceKey, string> = { CRM: "From £59/month", BESPOKE_CRM: "From £1,000", WEBSITE: "From £499", EXPERT: "From £150" };

const FORMATS: { icon: keyof typeof ICONS; label: string; body: string }[] = [
  { icon: "phone", label: "WhatsApp calls", body: "Talk it through from your phone, wherever you are." },
  { icon: "video", label: "1:1 video sessions", body: "Share your screen and work through documents together." },
  { icon: "message", label: "Daily WhatsApp advice", body: "Message a question on any working day and get a written reply." },
  { icon: "calendar", label: "Weekly catch-ups", body: "A regular slot with the same manager to keep your plan moving." },
];

const HOW_IT_WORKS: { icon: keyof typeof ICONS; title: string; body: string }[] = [
  { icon: "check", title: "Enquire", body: "Pick a service and tell us a little about your business." },
  { icon: "inbox", title: "Get your pack", body: "Prices, what's included and next steps land in your inbox straight away." },
  { icon: "reply", title: "Reply to agree", body: "Ask questions on the same email thread. We confirm scope and price in writing." },
  { icon: "rocket", title: "We get started", body: "Pay the agreed deposit or first month and we set things up." },
];

/** Decorative hero art: a dashboard card, a chat bubble and a little house, in white lines. */
function HeroArt() {
  return (
    <svg viewBox="0 0 260 200" className="h-full w-full" aria-hidden="true">
      <g fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="70" y="30" width="170" height="120" rx="14" fill="white" fillOpacity="0.12" strokeOpacity="0.55" />
        <path d="M70 58h170" strokeOpacity="0.4" />
        <circle cx="86" cy="44" r="3" fill="white" stroke="none" opacity="0.7" />
        <circle cx="98" cy="44" r="3" fill="white" stroke="none" opacity="0.5" />
        <path d="M90 128l26-24 20 14 30-34 26 20 30-26" strokeOpacity="0.9" strokeWidth="3" />
        <path d="M90 136h130" strokeOpacity="0.3" />
        <rect x="18" y="96" width="92" height="58" rx="14" fill="white" fillOpacity="0.95" stroke="none" />
        <path d="M40 154l-8 16 22-16" fill="white" stroke="none" />
        <path d="M34 116h56M34 128h40M34 140h48" stroke="rgb(22 102 170)" strokeWidth="3.5" />
        <path d="M182 176v-26l22-18 22 18v26z" fill="white" fillOpacity="0.2" />
        <path d="M197 176v-12h14v12" />
      </g>
    </svg>
  );
}

type Expert = { id: string; name: string; role: string; specialism: string; bio: string; hourlyRate: number };

const tomorrow = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(Date.now() + 86_400_000));

function EnquiryForm({ service, experts, allowed, preview = false }: { service: ProService; experts: Expert[]; allowed: boolean; preview?: boolean }) {
  if (preview) {
    return <p className="rounded-card border border-dashed border-line-strong p-3 text-[14px] text-ink-soft">Admin preview: providers see the enquiry and call booking form here.</p>;
  }
  if (!allowed) {
    return <Link href="/provider/membership" className="btn-secondary">Upgrade to enquire</Link>;
  }
  const id = service.key.toLowerCase();
  return (
    <details className="group rounded-card border border-line bg-paper-sunk/40 p-4 open:bg-paper-card">
      <summary className="btn-primary cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <Icon name="inbox" className="h-4 w-4" /> Enquire, book a call or get the pack
      </summary>
      <form action={proServiceEnquiryAction} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="service" value={service.key} />
        {service.key === "EXPERT" && (
          <label className="block">
            <span className="label">Option</span>
            <select id={`${id}-plan`} name="plan" className="field" defaultValue={EXPERT_PLANS[0]}>
              {EXPERT_PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        )}
        {service.key === "EXPERT" && experts.length > 0 && (
          <>
            <label className="block">
              <span className="label">Manager</span>
              <select id={`${id}-expert`} name="expertId" className="field">
                <option value="">Suggest someone for me</option>
                {experts.map((e) => <option key={e.id} value={e.id}>{e.name} · {money(e.hourlyRate)}/hour</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">One-off session length</span>
              <select id={`${id}-hours`} name="hours" className="field" defaultValue="1">
                {SESSION_HOURS.map((h) => <option key={h} value={h}>{sessionLabel(h)}</option>)}
              </select>
            </label>
          </>
        )}
        <fieldset className="rounded-card border border-line p-4 sm:col-span-2">
          <legend className="px-1 text-[14px] font-semibold text-ink">Would you like a call or meeting?</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {[["", "No, just email me the pack"], ...Object.entries(MEETING_TYPES)].map(([v, l]) => (
              <label key={v || "none"} className="flex cursor-pointer items-center gap-2 rounded-pill border border-line px-3 py-1.5 text-[14px] has-[:checked]:border-pine has-[:checked]:bg-pine-light has-[:checked]:text-pine-dark">
                <input type="radio" name="meetingType" value={v} defaultChecked={!v} className="accent-[#1666AA]" id={`${id}-meet-${v || "none"}`} /> {l}
              </label>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Preferred day (optional)</span>
              <input id={`${id}-meet-date`} name="meetingDate" type="date" min={tomorrow()} className="field" />
            </label>
            <label className="block">
              <span className="label">Preferred time</span>
              <select id={`${id}-meet-window`} name="meetingWindow" className="field" defaultValue={TIME_WINDOWS[0]}>
                {TIME_WINDOWS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-2 text-[12.5px] text-ink-faint">Weekdays, UK time. We'll confirm the exact time by email with an add-to-calendar link.</p>
        </fieldset>
        <label className="block">
          <span className="label">Phone (optional)</span>
          <input id={`${id}-phone`} name="phone" type="tel" maxLength={30} className="field" autoComplete="tel" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">What do you need? (optional)</span>
          <textarea id={`${id}-message`} name="message" rows={3} maxLength={1500} className="field" placeholder="For example: 12 properties, 8 staff, records in spreadsheets today." />
          <span className="mt-1 block text-[12.5px] text-ink-faint">Please leave out residents' names and any personal or case details.</span>
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <SubmitButton pendingLabel="Sending your pack…">Send me the pack</SubmitButton>
          <span className="text-[13px] text-ink-soft">We email you the full pack and keep a copy, so replies stay in one email thread.</span>
        </div>
      </form>
    </details>
  );
}

function PriceCard({ p }: { p: ProService["prices"][number] }) {
  return (
    <div className={clsx("relative flex flex-col rounded-card border bg-paper-card p-5", p.popular ? "border-pine shadow-raise ring-1 ring-pine/30" : "border-line")}>
      {p.popular && <span className="absolute -top-3 left-5 rounded-pill bg-pine px-2.5 py-1 text-[11.5px] font-semibold tracking-wide text-white">Most popular</span>}
      <p className="text-[14px] font-semibold text-ink-soft">{p.label}</p>
      <p className="mt-1 font-display text-[26px] leading-tight text-ink">{p.price}</p>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{p.detail}</p>
      {p.includes && (
        <ul className="mt-3 space-y-1.5 text-[13.5px] text-ink">
          {p.includes.map((i) => (
            <li key={i} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-pine" />{i}</li>
          ))}
        </ul>
      )}
      {p.suits && <p className="mt-auto border-t border-line pt-3 text-[13px] text-ink-soft"><span className="font-semibold text-ink">Suits: </span>{p.suits}</p>}
    </div>
  );
}

export default async function ProServicesPage({ searchParams }: { searchParams: Promise<{ sent?: string; queued?: string; error?: string }> }) {
  // Admins without a provider company see a read-only preview of the page providers get.
  const signedIn = await requireUser("/provider/pro-services");
  const preview = !signedIn.staffOf[0] && hasAdminPermission(signedIn);
  const { user, companyId } = preview ? { user: signedIn, companyId: null } : await requireCompany();
  const query = await searchParams;
  const [nav, limits, experts, enquiries] = await Promise.all([
    companyId ? providerNav(companyId) : adminNav(),
    companyId ? planLimits(companyId) : null,
    db.proExpert.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    companyId ? db.proServiceEnquiry.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, take: 10 }) : [],
  ]);
  const tier = limits?.membership.tier ?? "PROFESSIONAL";
  const allowed = canUseProServices(tier);
  const business = tier === "BUSINESS";

  return (
    <DashboardShell
      title="Pro Services"
      subtitle="CRM, websites and expert advice from the RoomsNow team, for Professional and Business members. Prices are plus VAT."
      nav={nav}
      active={preview ? "/admin/pro-services" : "/provider/pro-services"}
    >
      {preview ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-pine/30 bg-pine-light/60 p-4 text-[14.5px] text-pine-dark">
          <span><strong>Admin preview.</strong> This is the page Professional and Business providers see. Enquiry forms are switched off here.</span>
          <Link href="/admin/pro-services" className="btn-secondary">Back to enquiries</Link>
        </div>
      ) : (
        <MembershipTabs active="pro" />
      )}
      {query.sent && <div className="mb-5"><FormSuccess message={`Pack sent to ${user.email} (reference ${query.sent}). Reply to that email with any questions. If you asked for a call or meeting, we'll email you to confirm the time.`} /></div>}
      {query.queued && <div className="mb-5"><FormSuccess message={`Enquiry saved (reference ${query.queued}). We couldn't send the email just now, so the team will email you the pack.`} /></div>}
      {query.error && <div className="mb-5"><FormError message={ERRORS[query.error] ?? "Something went wrong. Please try again."} /></div>}

      <section className="relative isolate overflow-hidden rounded-[22px] bg-linear-to-br from-pine-dark via-pine to-[#3d8fd6] p-6 text-white sm:p-10">
        <div aria-hidden="true" className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-white/10" />
        <div aria-hidden="true" className="absolute -bottom-32 right-40 -z-10 h-64 w-64 rounded-full bg-white/5" />
        <div className="grid items-center gap-6 lg:grid-cols-[1fr_260px]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-pill bg-white/15 px-3 py-1.5 text-[12px] font-semibold tracking-[0.08em]">
              PRO SERVICES · {preview ? "ADMIN PREVIEW" : business ? "BUSINESS MEMBER" : allowed ? "PROFESSIONAL MEMBER" : "FOR PAID MEMBERS"}
            </span>
            <h2 className="mt-4 max-w-[22ch] font-display text-[30px] leading-[1.1] [text-wrap:balance] sm:text-[40px]">Run a tighter housing business, with people who've done it</h2>
            <p className="mt-3 max-w-[56ch] text-[15.5px] leading-relaxed text-white/85">A staff CRM based on how we run our own supported accommodation, websites that bring in referrals, and advice from managers who run services like yours. Enquire about any of them and your full pack arrives by email.</p>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-white/90">
              {["Prices up front, plus VAT", "Housing operators, not generic consultants", business ? "10% off expert time" : "Written pack for every enquiry"].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><Icon name="check" className="h-4 w-4" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="hidden h-[200px] lg:block"><HeroArt /></div>
        </div>
      </section>

      {!allowed && limits && (
        <div className="card mt-5 flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-[15px] text-ink-soft">You're on <strong className="text-ink">{limits.membership.name}</strong>. Pro Services come with Professional and Business. You can look at the prices now.</p>
          <Link href="/provider/membership" className="btn-primary">See plans</Link>
        </div>
      )}

      <nav aria-label="Services" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {PRO_SERVICE_KEYS.map((k) => (
          <a key={k} href={`#${k.toLowerCase()}`} className="card group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-pine/40 hover:shadow-raise">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-pine-light text-pine-dark group-hover:bg-pine group-hover:text-white"><Icon name={SERVICE_ICON[k]} /></span>
            <span className="min-w-0">
              <span className="block text-[14.5px] font-semibold leading-tight text-ink">{PRO_SERVICES[k].name}</span>
              <span className="block text-[12.5px] text-ink-soft">{STARTS_AT[k]}</span>
            </span>
          </a>
        ))}
      </nav>

      <section aria-labelledby="how-it-works" className="mt-8">
        <h2 id="how-it-works" className="text-[20px]">How it works</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-card border border-line bg-paper-card p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pine-light text-pine-dark"><Icon name={s.icon} className="h-4.5 w-4.5" /></span>
              <span>
                <span className="block text-[14.5px] font-semibold text-ink">{i + 1}. {s.title}</span>
                <span className="mt-0.5 block text-[13.5px] leading-relaxed text-ink-soft">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-8 space-y-8">
        {PRO_SERVICE_KEYS.map((key) => {
          const s = PRO_SERVICES[key];
          const isExpert = key === "EXPERT";
          return (
            <section key={key} id={key.toLowerCase()} className={clsx("card scroll-mt-24 overflow-hidden", isExpert && "border-pine/40")}>
              <div className="flex flex-wrap items-start gap-4 border-b border-line bg-linear-to-r from-pine-light/70 via-pine-light/25 to-transparent p-5 sm:p-6">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-linear-to-br from-pine to-[#70baff] text-white shadow-raise"><Icon name={SERVICE_ICON[key]} className="h-6 w-6" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-pine-dark">{s.name}</p>
                  <h2 className="mt-1 font-display text-[23px] leading-tight [text-wrap:balance] sm:text-[26px]">{s.headline}</h2>
                  <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-ink-soft">{s.helps}</p>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="mb-7 grid items-center gap-5 lg:grid-cols-[1.6fr_1fr]">
                  <ProDemo kind={key} />
                  <div>
                    <p className="eyebrow">Watch the demo · {DEMO_STORIES[key].captions.length * 4} seconds</p>
                    <ol className="mt-3 space-y-2">
                      {DEMO_STORIES[key].captions.map((c, i) => (
                        <li key={c} className="flex gap-2.5 text-[14.5px] text-ink"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pine-light text-[12px] font-bold text-pine-dark">{i + 1}</span>{c}</li>
                      ))}
                    </ol>
                    <a href={`/demos/${DEMO_SLUG[key]}`} target="_blank" rel="noopener" className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-pine-dark underline underline-offset-4">Open the shareable demo page</a>
                  </div>
                </div>
                {isExpert && (
                  <>
                    <h3 className="text-[16px] font-semibold">Ways to get advice</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {FORMATS.map((f) => (
                        <div key={f.label} className="rounded-card bg-paper-sunk/60 p-4">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-paper-card text-pine-dark shadow-sm"><Icon name={f.icon} className="h-4.5 w-4.5" /></span>
                          <p className="mt-2 text-[14.5px] font-semibold text-ink">{f.label}</p>
                          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{f.body}</p>
                        </div>
                      ))}
                    </div>
                    <h3 className="mt-7 text-[16px] font-semibold">Choose how often</h3>
                  </>
                )}

                <div className={clsx("mt-4 grid gap-4 sm:grid-cols-2", isExpert ? "xl:grid-cols-4" : "lg:grid-cols-3")}>
                  {s.prices.map((p) => <PriceCard key={p.label} p={p} />)}
                </div>

                <ul className="mt-6 grid gap-2 text-[14.5px] text-ink sm:grid-cols-3">
                  {s.outcomes.map((o) => (
                    <li key={o} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4.5 w-4.5 shrink-0 text-pine" />{o}</li>
                  ))}
                </ul>

                {isExpert && (
                  <>
                    <h3 className="mt-7 text-[16px] font-semibold">What happens in a session</h3>
                    <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {SESSION_STEPS.map((st, i) => (
                        <li key={st.title} className="relative rounded-card border border-line p-4 pl-12">
                          <span className="absolute left-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-pine text-[12px] font-semibold text-white">{i + 1}</span>
                          <p className="text-[14.5px] font-semibold text-ink">{st.title}</p>
                          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{st.body}</p>
                        </li>
                      ))}
                    </ol>

                    <h3 className="mt-7 text-[16px] font-semibold">Meet the managers</h3>
                    {experts.length ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {experts.map((e) => (
                          <div key={e.id} className="rounded-card border border-line p-4">
                            <div className="flex items-center gap-3">
                              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-linear-to-br from-pine to-[#70baff] font-semibold text-white">
                                {e.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                              </span>
                              <span className="min-w-0">
                                <span className="block font-semibold text-ink">{e.name}</span>
                                <span className="block text-[13px] text-ink-soft">{e.role}</span>
                              </span>
                            </div>
                            <p className="mt-3 inline-block rounded-pill bg-pine-light px-2.5 py-1 text-[12px] font-semibold text-pine-dark">{e.specialism}</p>
                            {e.bio && <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{e.bio}</p>}
                            <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-t border-line pt-3 text-[14px] tabular-nums">
                              {SESSION_HOURS.map((h) => (
                                <div key={h} className="contents">
                                  <dt className="text-ink-soft">{sessionLabel(h)}</dt>
                                  <dd className="text-right font-semibold text-ink">
                                    {business && <s className="mr-1.5 font-normal text-ink-faint">{money(sessionPrice(e.hourlyRate, h))}</s>}
                                    {money(sessionPrice(e.hourlyRate, h, business))}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-card border border-dashed border-line-strong p-4 text-[15px] text-ink-soft">Managers are being added. One-off sessions start at <strong className="text-ink">£150 per hour</strong>. Enquire and we'll match you with the right person.</p>
                    )}
                  </>
                )}

                <p className="mt-5 text-[13px] leading-relaxed text-ink-faint">{s.terms}</p>
                <div className="mt-5"><EnquiryForm service={s} experts={experts} allowed={allowed} preview={preview} /></div>
              </div>
            </section>
          );
        })}
      </div>

      {enquiries.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[20px]">Your enquiries</h2>
          <p className="mt-1 text-[14px] text-ink-soft">Each one has a reference. Keep it in the subject when you reply so the conversation stays together.</p>
          <div className="mt-3">
            <DataTable head={["Date", "Reference", "Service", "Call or meeting", "Pack emailed", "Status"]}>
              {enquiries.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3">{shortDate(e.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-[13px]">{e.reference}</td>
                  <td className="px-4 py-3">{PRO_SERVICES[e.service as ProServiceKey]?.name ?? e.service}{e.expertName ? ` · ${e.expertName}` : ""}</td>
                  <td className="px-4 py-3 text-[14px]">
                    {e.meetingAt ? (
                      <span className="font-semibold text-[#1D6E49]">Booked: {ukMeetingTime(e.meetingAt)}</span>
                    ) : e.meetingType ? (
                      <span className="text-ink-soft">Requested: {MEETING_TYPES[e.meetingType as keyof typeof MEETING_TYPES] ?? e.meetingType}, {e.meetingWish}</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">{e.packSentAt ? shortDate(e.packSentAt) : "Pending"}</td>
                  <td className="px-4 py-3 capitalize text-ink-soft">{e.status.toLowerCase()}</td>
                </tr>
              ))}
            </DataTable>
          </div>
        </section>
      )}
    </DashboardShell>
  );
}
