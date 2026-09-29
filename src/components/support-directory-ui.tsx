import Link from "next/link";
import { clsx } from "@/lib/clsx";
import {
  directionsHref,
  SUPPORT_AUDIENCES,
  SUPPORT_POST_KINDS,
  supportCategoryLabel,
  telHref,
  type SupportAudience,
  type SupportPostKindValue,
} from "@/lib/support-directory";

const ICONS: Record<string, React.ReactNode> = {
  crisis: <path d="M12 3 2.5 20h19L12 3Zm0 6v5m0 3h.01" />,
  "mental-health": <path d="M12 20s-7-4.4-7-9.4A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.6c0 5-7 9.4-7 9.4Z" />,
  "drugs-alcohol": <><rect x="3" y="9" width="18" height="6" rx="3" /><path d="M12 9v6" /></>,
  homelessness: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4v-9Z" />,
  "domestic-abuse": <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" />,
  "money-benefits": <><circle cx="12" cy="12" r="8" /><path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2 0 2.8 5 1.5 5 4 0 1.2-1.1 2-2.5 2-1 0-2-.5-2.5-1.5M12 6.5V8m0 8v1.5" /></>,
  "young-people": <><circle cx="12" cy="7" r="3" /><path d="M6 20a6 6 0 0 1 12 0" /></>,
  "health-wellbeing": <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6V4Z" />,
  training: <path d="m2 9 10-5 10 5-10 5L2 9Zm4 2v5c2 2 10 2 12 0v-5M22 9v6" />,
};

export function SupportCategoryIcon({ slug, className }: { slug: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[slug] ?? ICONS["health-wellbeing"]}
    </svg>
  );
}

/** Always-visible emergency strip: the three numbers anyone in crisis needs first. */
export function CrisisStrip({ stacked = false }: { stacked?: boolean }) {
  const lines = [
    { label: "Emergency or life at risk", number: "999" },
    { label: "Urgent mental health (choose the mental health option)", number: "111" },
    { label: "Samaritans, free 24/7", number: "116 123" },
  ];
  return (
    <aside aria-label="If you need help right now" className="rounded-card border border-clay/30 bg-clay-light/70 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-[14px] font-semibold text-clay">
        <SupportCategoryIcon slug="crisis" className="h-4 w-4" /> Need help right now?
      </p>
      <ul className={clsx("mt-3 grid gap-2", !stacked && "sm:grid-cols-3")}>
        {lines.map((line) => (
          <li key={line.number}>
            <a href={telHref(line.number)} className="group flex items-center justify-between gap-3 rounded-[10px] border border-clay/20 bg-paper-card px-3.5 py-2.5 transition-colors hover:border-clay/50">
              <span className="min-w-0">
                <span className="block font-display text-[20px] font-bold tabular-nums text-ink">{line.number}</span>
                <span className="block text-[12.5px] leading-snug text-ink-soft">{line.label}</span>
              </span>
              <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-clay text-white transition-transform group-hover:scale-110">
                <PhoneIcon />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function PhoneIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}

type CardOrg = {
  slug: string;
  name: string;
  summary: string;
  categories: string[];
  scope: "NATIONAL" | "LOCAL";
  areas: string[];
  phone: string | null;
  phoneNote: string | null;
  textNumber: string | null;
  website: string | null;
  hours: string | null;
  crisis: boolean;
  locations: Array<{ id: string; name: string; address: string; city: string; postcode: string }>;
  posts: Array<{ id: string }>;
};

export function SupportOrgCard({ org }: { org: CardOrg }) {
  const firstLocation = org.locations[0];
  return (
    <article className={clsx("card interactive-card group flex h-full flex-col p-5", org.crisis && "border-clay/35")}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={clsx("grid h-11 w-11 shrink-0 place-items-center rounded-[12px]", org.crisis ? "bg-clay-light text-clay" : "bg-pine-light text-pine-dark")}>
          <SupportCategoryIcon slug={org.categories[0] ?? "health-wellbeing"} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] leading-snug">
            <Link href={`/support-services/${org.slug}`} className="hover:underline">{org.name}</Link>
          </h3>
          <p className="mt-0.5 text-[12.5px] text-ink-faint">
            {org.scope === "NATIONAL" ? "UK-wide" : org.areas.join(", ") || firstLocation?.city || "Local service"}
            {org.posts.length > 0 && <span className="ml-2 rounded-pill bg-pine-light px-2 py-0.5 font-medium text-pine-dark">{org.posts.length} upcoming</span>}
          </p>
        </div>
      </div>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{org.summary}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {org.categories.slice(0, 3).map((slug) => (
          <span key={slug} className="rounded-pill bg-paper-sunk px-2 py-0.5 text-[11.5px] text-ink-soft">{supportCategoryLabel(slug)}</span>
        ))}
      </div>
      {firstLocation && (
        <p className="mt-3 flex items-start gap-1.5 text-[13px] text-ink-soft">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
          <span>{firstLocation.address}, {firstLocation.postcode}{org.locations.length > 1 ? ` + ${org.locations.length - 1} more` : ""}</span>
        </p>
      )}
      {org.hours && <p className="mt-1 text-[12.5px] text-ink-faint">{org.hours}</p>}
      <div aria-hidden="true" className="min-h-4 flex-1" />
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
        {org.phone && (
          <a href={telHref(org.phone)} className="btn-primary min-h-10 px-3.5 py-2 text-[14px]">
            <PhoneIcon /> {org.phone}
          </a>
        )}
        {!org.phone && org.textNumber && <span className="rounded-[10px] bg-pine-light px-3 py-2 text-[14px] font-medium text-pine-dark">{org.textNumber}</span>}
        <Link href={`/support-services/${org.slug}`} className="btn-secondary min-h-10 px-3.5 py-2 text-[14px]">Details</Link>
      </div>
      {org.phoneNote && <p className="mt-2 text-[12px] text-ink-faint">{org.phoneNote}</p>}
    </article>
  );
}

type CardPost = {
  id: string;
  kind: string;
  title: string;
  body: string;
  audience: string;
  startsAt: Date | null;
  endsAt: Date | null;
  venue: string | null;
  free: boolean;
  bookingUrl: string | null;
  organisation?: { name: string; slug: string };
};

function when(post: CardPost) {
  if (!post.startsAt) return null;
  const day = post.startsAt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const time = post.startsAt.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
  const end = post.endsAt && post.endsAt.toDateString() === post.startsAt.toDateString() ? `–${post.endsAt.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" })}` : "";
  return `${day}, ${time}${end}`;
}

export function SupportPostCard({ post, children }: { post: CardPost; children?: React.ReactNode }) {
  const date = post.startsAt;
  return (
    <article className="card flex h-full gap-4 p-4 sm:p-5">
      <div aria-hidden="true" className={clsx("grid h-16 w-14 shrink-0 place-items-center rounded-[12px] text-center", date ? "bg-pine text-white" : "bg-pine-light text-pine-dark")}>
        {date ? (
          <span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] opacity-85">{date.toLocaleDateString("en-GB", { month: "short" })}</span>
            <span className="block font-display text-[22px] font-bold leading-none">{date.getDate()}</span>
          </span>
        ) : (
          <SupportCategoryIcon slug={post.kind === "TRAINING" ? "training" : "health-wellbeing"} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-pill bg-pine-light px-2 py-0.5 text-[11.5px] font-semibold text-pine-dark">{SUPPORT_POST_KINDS[post.kind as SupportPostKindValue] ?? "News"}</span>
          {post.free && <span className="rounded-pill bg-[#e3f5ec] px-2 py-0.5 text-[11.5px] font-semibold text-[#166a43]">Free</span>}
          {post.audience !== "everyone" && <span className="rounded-pill bg-paper-sunk px-2 py-0.5 text-[11.5px] text-ink-soft">For {SUPPORT_AUDIENCES[post.audience as SupportAudience]?.toLowerCase() ?? post.audience}</span>}
        </div>
        <h3 className="mt-1.5 text-[16px] leading-snug">{post.title}</h3>
        {post.organisation && (
          <p className="text-[13px] text-ink-soft">
            by <Link href={`/support-services/${post.organisation.slug}`} className="font-medium text-pine-dark hover:underline">{post.organisation.name}</Link>
          </p>
        )}
        {(when(post) || post.venue) && <p className="mt-1 text-[13px] text-ink-soft">{[when(post), post.venue].filter(Boolean).join(" · ")}</p>}
        <p className="mt-2 line-clamp-3 whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{post.body}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {post.bookingUrl && <a href={post.bookingUrl} target="_blank" rel="noopener noreferrer" className="text-[14px] font-semibold text-pine-dark hover:underline">Book or find out more <span aria-hidden="true" className="nudge-arrow">→</span></a>}
          {post.venue && <a href={directionsHref(post.venue)} target="_blank" rel="noopener noreferrer" className="text-[13px] text-ink-soft hover:text-ink hover:underline">Directions</a>}
          {children}
        </div>
      </div>
    </article>
  );
}
