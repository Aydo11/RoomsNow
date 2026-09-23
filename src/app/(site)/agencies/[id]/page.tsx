/* eslint-disable @next/next/no-img-element -- agency images may be local uploads or R2; plain <img> keeps both working */
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { DirectMessageForm } from "@/components/direct-message-form";
import { AGENCY_TYPES, websiteHref } from "@/lib/agency";
import { supportLabel } from "@/lib/taxonomy";
import { monthYear } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Referral agency", robots: { index: false, follow: false } };

/**
 * A referral agency's profile, as providers see it — who is referring to
 * them, where they work and who they support. Signed-in accounts only: these
 * are working professionals, not a public directory.
 */
export default async function AgencyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireUser(`/agencies/${id}`);

  const agent = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      status: true,
      deletedAt: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      organisation: true,
      locationLabel: true,
      avatarUrl: true,
      socialLinks: true,
      createdAt: true,
      referrerProfile: true,
    },
  });
  if (!agent || agent.role !== "REFERRER" || agent.status !== "ACTIVE" || agent.deletedAt) notFound();

  const [placed, referralsMade] = await Promise.all([
    db.referral.count({ where: { referrerId: agent.id, status: "MOVED_IN" } }),
    db.referral.count({ where: { referrerId: agent.id } }),
  ]);

  const profile = agent.referrerProfile;
  const name = agent.organisation || `${agent.firstName} ${agent.lastName}`;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  const socialLinks = Array.isArray(agent.socialLinks) ? (agent.socialLinks as { platform: string; url: string }[]) : [];
  const site = websiteHref(profile?.website);
  const isSelf = viewer.id === agent.id;
  const viewerIsProvider = viewer.staffOf.length > 0;

  return (
    <div className="shell py-6 sm:py-8">
      {isSelf && (
        <p className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-pine-light px-4 py-3 text-[14px] text-pine-dark">
          This is how providers see your agency.
          <Link href="/referrals/profile" className="font-medium underline">Edit profile</Link>
        </p>
      )}

      <header className="card overflow-hidden">
        <div className="relative h-40 bg-gradient-to-br from-pine-dark via-pine to-pine-light sm:h-56">
          {profile?.bannerUrl && <img src={profile.bannerUrl} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="relative px-6 pb-7 sm:px-8">
          <div className="-mt-12">
            {profile?.logoUrl || agent.avatarUrl ? (
              <img
                src={(profile?.logoUrl || agent.avatarUrl)!}
                alt={`${name} logo`}
                className="h-24 w-24 rounded-full border-4 border-white bg-white object-cover shadow-raise sm:h-28 sm:w-28"
              />
            ) : (
              <span className="grid h-24 w-24 place-items-center rounded-full border-4 border-white bg-pine-light text-[22px] font-bold text-pine-dark shadow-raise sm:h-28 sm:w-28">
                {initials || "?"}
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-pine-dark">Referral agency</p>
              <h1 className="mt-1 text-[28px] leading-tight sm:text-[34px]">{name}</h1>
              <p className="mt-1 text-[14px] text-ink-soft">
                {[profile?.agencyType ? AGENCY_TYPES[profile.agencyType] : null, agent.locationLabel].filter(Boolean).join(" · ") ||
                  "Professional referrer"}
              </p>
            </div>
            <dl className="flex gap-6 text-[14px]">
              <div>
                <dt className="text-ink-faint">Referrals made</dt>
                <dd className="font-display text-[24px] tabular-nums leading-tight">{referralsMade}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">People placed</dt>
                <dd className="font-display text-[24px] tabular-nums leading-tight">{placed}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              <h2 className="text-[19px]">About</h2>
              <p className="mt-2 max-w-[72ch] whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
                {profile?.about || `${name} refers people into accommodation through RoomsNow.`}
              </p>

              {profile?.specialisms && profile.specialisms.length > 0 && (
                <div className="mt-5">
                  <h2 className="text-[15px] font-medium">Who they mainly refer</h2>
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {profile.specialisms.map((slug) => (
                      <span key={slug} className="chip">{supportLabel(slug)}</span>
                    ))}
                  </p>
                </div>
              )}

              {profile?.areasCovered && profile.areasCovered.length > 0 && (
                <div className="mt-5">
                  <h2 className="text-[15px] font-medium">Areas covered</h2>
                  <p className="mt-1 text-[15px] text-ink-soft">{profile.areasCovered.join(", ")}</p>
                </div>
              )}
            </div>

            <aside className="space-y-4 rounded-[12px] bg-paper p-4 text-[14px]">
              <div className="flex items-center gap-3">
                {agent.avatarUrl ? (
                  <img src={agent.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-pine-light text-[14px] font-semibold text-pine-dark">
                    {`${agent.firstName[0] ?? ""}${agent.lastName[0] ?? ""}`.toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {agent.firstName} {agent.lastName}
                  </p>
                  <p className="truncate text-[13px] text-ink-faint">{agent.jobTitle || "Referrer"}</p>
                </div>
              </div>

              {(profile?.publicEmail || profile?.publicPhone) && (
                <dl className="space-y-2">
                  {profile?.publicEmail && (
                    <div>
                      <dt className="text-[12px] text-ink-faint">Email</dt>
                      <dd>
                        <a href={`mailto:${profile.publicEmail}`} className="break-words text-pine-dark hover:underline">
                          {profile.publicEmail}
                        </a>
                      </dd>
                    </div>
                  )}
                  {profile?.publicPhone && (
                    <div>
                      <dt className="text-[12px] text-ink-faint">Phone</dt>
                      <dd>
                        <a href={`tel:${profile.publicPhone.replace(/\s+/g, "")}`} className="text-pine-dark hover:underline">
                          {profile.publicPhone}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              )}

              {site && (
                <a href={site} target="_blank" rel="noopener noreferrer nofollow" className="btn-secondary w-full">
                  Visit website
                </a>
              )}

              {socialLinks.length > 0 && (
                <p className="flex flex-wrap gap-2">
                  {socialLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="chip capitalize hover:border-pine hover:text-pine-dark"
                    >
                      {link.platform}
                    </a>
                  ))}
                </p>
              )}

              <p className="text-[12px] text-ink-faint">On RoomsNow since {monthYear(agent.createdAt)}</p>

              {!isSelf && viewerIsProvider && (
                <div className="border-t border-line pt-4">
                  <DirectMessageForm
                    recipientUserId={agent.id}
                    subject={`Hello from a provider`}
                    label={`Message ${agent.firstName}`}
                    placeholder={`Hi ${agent.firstName} — we have rooms that may suit the people you support.`}
                  />
                </div>
              )}
            </aside>
          </div>
        </div>
      </header>
    </div>
  );
}
