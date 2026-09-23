import { notFound } from "next/navigation";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { MessageProviderForm } from "@/components/message-provider-form";
import { ReportForm } from "@/components/report-form";
import { ACCOMMODATION_TYPES, GENDER_ARRANGEMENTS, supportLabel } from "@/lib/taxonomy";
import { initials, money, monthYear } from "@/lib/format";
import { exampleMoveInDate, findExamplePerson, isExamplePersonId, type ExamplePerson } from "@/lib/example-people";

export const dynamic = "force-dynamic";

export default async function LookingForAdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (isExamplePersonId(id)) {
    const example = findExamplePerson(id);
    if (!example) notFound();
    return <ExampleProfile person={example} />;
  }
  const [ad, user] = await Promise.all([
    db.lookingForAd.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
            profile: { select: { showPhoto: true, photoUrl: true, showAge: true, discoverable: true, accessibilityNeeds: true } },
          },
        },
      },
    }),
    getCurrentUser(),
  ]);

  if (!ad || ad.user.status !== "ACTIVE") notFound();

  const isOwner = user?.id === ad.userId;
  if (!isOwner && (ad.status !== "ACTIVE" || !ad.user.profile?.discoverable) && !hasAdminPermission(user)) notFound();

  if (!isOwner) await db.lookingForAd.update({ where: { id: ad.id }, data: { views: { increment: 1 } } });

  const canContact = user?.role === "PROVIDER" || user?.role === "REFERRER" || user?.role === "ADMIN";

  return (
    <div className="shell max-w-4xl py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex items-center gap-4">
            {ad.user.profile?.showPhoto && ad.user.profile.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.user.profile.photoUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <span className="grid h-14 w-14 place-items-center rounded-full bg-paper-sunk text-[18px] text-ink-soft">
                {initials(ad.user.firstName, ad.user.lastName)}
              </span>
            )}
            <div>
              <p className="text-[15px]">
                {ad.user.firstName} {ad.user.lastName.charAt(0)}.
              </p>
              <p className="text-[13px] text-ink-faint">
                {ad.city}
                {ad.user.profile?.showAge && ad.age ? ` · ${ad.age} years old` : ""}
              </p>
            </div>
          </div>

          <h1 className="mt-6 text-[30px] leading-tight">{ad.title}</h1>

          <p className="mt-4 flex flex-wrap gap-1.5">
            {ad.supportTypes.map((slug) => (
              <span key={slug} className="chip chip-active">{supportLabel(slug)}</span>
            ))}
          </p>

          <dl className="mt-6 grid gap-x-8 gap-y-4 border-y border-line py-6 sm:grid-cols-3">
            <Detail label="Looking in" value={`${ad.city}${ad.radiusMiles ? ` + ${ad.radiusMiles} miles` : ""}`} />
            <Detail label="Needs somewhere by" value={monthYear(ad.moveInDate)} />
            <Detail label="Budget" value={ad.budgetWeekly ? `${money(ad.budgetWeekly)} per week` : "Flexible"} />
            <Detail
              label="Accommodation"
              value={ad.accommodationTypes.map((t) => ACCOMMODATION_TYPES[t]).join(", ") || "Open to options"}
            />
            <Detail label="Household" value={GENDER_ARRANGEMENTS[ad.genderArrangement]} />
            {ad.accessibilityNeeds && <Detail label="Access needs" value={ad.accessibilityNeeds} />}
          </dl>

          {ad.about && (
            <section className="mt-7">
              <h2 className="text-[20px]">About me</h2>
              <p className="prose-advert mt-2 whitespace-pre-line">{ad.about}</p>
            </section>
          )}

          {ad.lookingFor && (
            <section className="mt-7">
              <h2 className="text-[20px]">What I&apos;m looking for</h2>
              <p className="prose-advert mt-2 whitespace-pre-line">{ad.lookingFor}</p>
            </section>
          )}

          {ad.videoUrl && (
            <section className="mt-7">
              <h2 className="text-[20px]">Video introduction</h2>
              <div className="mt-3 aspect-video overflow-hidden rounded-card border border-line">
                <iframe src={ad.videoUrl} title="Video introduction" allowFullScreen className="h-full w-full" />
              </div>
            </section>
          )}

          <div className="mt-10">
            <ReportForm targetType="LOOKING_FOR_AD" targetId={ad.id} />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {isOwner ? (
            <div className="card p-5">
              <h2 className="text-[17px]">This is your advert</h2>
              <p className="mt-1.5 text-[14px] text-ink-soft">Seen {ad.views} times.</p>
              <a href="/dashboard/advert" className="btn-secondary mt-4 w-full">Edit advert</a>
            </div>
          ) : canContact ? (
            <MessageProviderForm lookingForAdId={ad.id} signedIn={Boolean(user)} />
          ) : (
            <div className="card p-5 text-[14px] leading-relaxed text-ink-soft">
              Only provider and professional accounts can message people directly. If you&apos;re
              looking for accommodation yourself, search adverts instead.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/** A clearly-labelled sample profile: same layout as a real one, never messageable. */
function ExampleProfile({ person }: { person: ExamplePerson }) {
  return (
    <div className="shell max-w-4xl py-10">
      <div role="note" className="mb-6 rounded-card border border-dashed border-pine/40 bg-pine-light/40 px-4 py-3 text-[14px] leading-relaxed text-ink-soft">
        <strong className="font-semibold text-ink">This is an example profile, not a real person.</strong>{" "}
        It shows the kind of information people share when they&apos;re looking for accommodation on RoomsNow.
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-paper-sunk text-[18px] text-ink-soft">
              {person.firstName.charAt(0)}
              {person.lastInitial}
            </span>
            <div>
              <p className="flex items-center gap-2 text-[15px]">
                {person.firstName} {person.lastInitial}.
                <span className="rounded-pill bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white">Example</span>
              </p>
              <p className="text-[13px] text-ink-faint">
                {person.city} · {person.age} years old
              </p>
            </div>
          </div>

          <h1 className="mt-6 text-[30px] leading-tight">{person.title}</h1>

          <p className="mt-4 flex flex-wrap gap-1.5">
            {person.supportTypes.map((slug) => (
              <span key={slug} className="chip chip-active">{supportLabel(slug)}</span>
            ))}
          </p>

          <dl className="mt-6 grid gap-x-8 gap-y-4 border-y border-line py-6 sm:grid-cols-3">
            <Detail label="Looking in" value={`${person.city} + ${person.radiusMiles} miles`} />
            <Detail label="Needs somewhere by" value={monthYear(exampleMoveInDate(person))} />
            <Detail label="Budget" value={person.budgetWeekly ? `${money(person.budgetWeekly)} per week` : "Flexible"} />
            <Detail
              label="Accommodation"
              value={person.accommodationTypes.map((t) => ACCOMMODATION_TYPES[t]).join(", ") || "Open to options"}
            />
            <Detail label="Household" value={GENDER_ARRANGEMENTS[person.genderArrangement]} />
            {person.accessibilityNeeds && <Detail label="Access needs" value={person.accessibilityNeeds} />}
          </dl>

          <section className="mt-7">
            <h2 className="text-[20px]">About me</h2>
            <p className="prose-advert mt-2 whitespace-pre-line">{person.about}</p>
          </section>

          <section className="mt-7">
            <h2 className="text-[20px]">What I&apos;m looking for</h2>
            <p className="prose-advert mt-2 whitespace-pre-line">{person.lookingFor}</p>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5 text-[14px] leading-relaxed text-ink-soft">
            <h2 className="text-[17px] text-ink">How contact works</h2>
            <p className="mt-1.5">
              On a real profile, providers and professionals see a message box here and contact the person through
              RoomsNow — their phone number and email are never shown.
            </p>
            <div className="mt-4 grid gap-2">
              <a href="/dashboard/advert" className="btn-primary w-full justify-center">Create your own profile</a>
              <a href="/people" className="btn-secondary w-full justify-center">Back to people</a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-[15px] text-ink">{value}</dd>
    </div>
  );
}
