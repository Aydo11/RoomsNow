import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { searchLookingForAds } from "@/server/search";
import { ACCOMMODATION_TYPES, supportLabel, SUPPORT_TYPES } from "@/lib/taxonomy";
import { initials, money, monthYear } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import { EXAMPLE_PEOPLE_THRESHOLD, exampleMoveInDate, examplePeopleFor } from "@/lib/example-people";

export const metadata = { title: "People looking for accommodation" };
export const dynamic = "force-dynamic";

type CardData = {
  id: string;
  name: string;
  initials: string;
  photoUrl: string | null;
  place: string;
  title: string;
  about: string | null;
  supportTypes: string[];
  moveInDate: Date | null;
  budgetWeekly: number | null;
  accommodationTypes: (keyof typeof ACCOMMODATION_TYPES)[];
  example?: boolean;
};

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ where?: string; support?: string; minAge?: string; maxAge?: string; page?: string }>;
}) {
  const query = await searchParams;
  const user = await getCurrentUser();
  const results = await searchLookingForAds({
    where: query.where,
    support: query.support ? [query.support] : [],
    minAge: query.minAge,
    maxAge: query.maxAge,
    page: query.page,
  });

  const canContact = user?.role === "PROVIDER" || user?.role === "REFERRER" || user?.role === "ADMIN";
  const firstPage = !query.page || query.page === "1";
  const showExamples = firstPage && results.total < EXAMPLE_PEOPLE_THRESHOLD;

  const cards: CardData[] = results.items.map((ad) => ({
    id: ad.id,
    name: `${ad.user.firstName} ${ad.user.lastName.charAt(0)}.`,
    initials: initials(ad.user.firstName, ad.user.lastName),
    photoUrl: ad.user.profile?.showPhoto && ad.user.profile.photoUrl ? ad.user.profile.photoUrl : null,
    place: `${ad.city}${ad.user.profile?.showAge && ad.age ? ` · ${ad.age}` : ""}`,
    title: ad.title,
    about: ad.about,
    supportTypes: ad.supportTypes,
    moveInDate: ad.moveInDate,
    budgetWeekly: ad.budgetWeekly,
    accommodationTypes: ad.accommodationTypes,
  }));

  const examples: CardData[] = showExamples
    ? examplePeopleFor(query).map((person) => ({
        id: person.id,
        name: `${person.firstName} ${person.lastInitial}.`,
        initials: `${person.firstName.charAt(0)}${person.lastInitial}`,
        photoUrl: null,
        place: `${person.city} · ${person.age}`,
        title: person.title,
        about: person.about,
        supportTypes: person.supportTypes,
        moveInDate: exampleMoveInDate(person),
        budgetWeekly: person.budgetWeekly,
        accommodationTypes: person.accommodationTypes,
        example: true,
      }))
    : [];

  return (
    <div className="shell py-10">
      <h1 className="text-[32px]">People looking for accommodation</h1>
      <p className="mt-2 max-w-[70ch] text-[16px] leading-relaxed text-ink-soft">
        Everyone here has chosen to be discoverable by providers. Nothing sensitive is shown, and
        you contact them through the platform — never by phone or email directly.
      </p>

      <form className="card mt-6 grid gap-3 p-4 sm:grid-cols-[1.2fr_1fr_0.6fr_0.6fr_auto] sm:items-end">
        <div>
          <label className="label" htmlFor="where">Area</label>
          <input id="where" name="where" defaultValue={query.where} className="field" placeholder="Birmingham" />
        </div>
        <div>
          <label className="label" htmlFor="support">Support need</label>
          <select id="support" name="support" defaultValue={query.support} className="field">
            <option value="">Any</option>
            {SUPPORT_TYPES.map((type) => (
              <option key={type.slug} value={type.slug}>{type.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="minAge">Min age</label>
          <input id="minAge" name="minAge" type="number" min={16} defaultValue={query.minAge} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="maxAge">Max age</label>
          <input id="maxAge" name="maxAge" type="number" min={16} defaultValue={query.maxAge} className="field" />
        </div>
        <button className="btn-primary h-[46px]">Search people</button>
      </form>

      {cards.length > 0 ? (
        <PeopleGrid cards={cards} canContact={canContact} />
      ) : !showExamples ? (
        <div className="mt-8">
          <EmptyState
            title="No one matches that search yet"
            body="Try a wider area or a different support category. People appear here only once they've made their advert discoverable."
          />
        </div>
      ) : null}

      {showExamples && (
        <section aria-labelledby="examples-heading" className={cards.length ? "mt-10" : "mt-8"}>
          <p id="examples-heading" className="text-[13px] text-ink-faint">
            Sample profiles showing the kind of people who use RoomsNow — not real people, and they can&apos;t be messaged.
          </p>
          <PeopleGrid cards={examples} canContact={false} />
        </section>
      )}
    </div>
  );
}

function PeopleGrid({ cards, canContact }: { cards: CardData[]; canContact: boolean }) {
  return (
    <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {cards.map((card) => (
        <li key={card.id} className="card flex flex-col p-4">
          <div className="flex items-center gap-2.5">
            {card.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper-sunk text-[13px] text-ink-soft">
                {card.initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[14px]">{card.name}</p>
              <p className="truncate text-[12px] text-ink-faint">{card.place}</p>
            </div>
          </div>

          <h3 className="mt-3 line-clamp-2 text-[15px] leading-snug">
            <Link href={`/people/${card.id}`} className="hover:text-pine-dark">{card.title}</Link>
          </h3>

          {card.about && <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">{card.about}</p>}

          <p className="mt-2.5 flex flex-wrap gap-1">
            {card.supportTypes.slice(0, 2).map((slug) => (
              <span key={slug} className="chip text-[12px]">{supportLabel(slug)}</span>
            ))}
            {card.supportTypes.length > 2 && <span className="chip text-[12px]">+{card.supportTypes.length - 2}</span>}
          </p>

          <dl className="mt-auto grid grid-cols-2 gap-y-0.5 border-t border-line pt-2.5 text-[12px]">
            <div className="flex gap-1">
              <dt className="text-ink-faint">By</dt>
              <dd>{monthYear(card.moveInDate)}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="text-ink-faint">Budget</dt>
              <dd>{card.budgetWeekly ? `${money(card.budgetWeekly)}/wk` : "Flexible"}</dd>
            </div>
            <div className="col-span-2 flex gap-1">
              <dt className="text-ink-faint">Wants</dt>
              <dd className="truncate">
                {card.accommodationTypes.map((t) => ACCOMMODATION_TYPES[t]).join(", ") || "Anything suitable"}
              </dd>
            </div>
          </dl>

          <Link
            href={`/people/${card.id}`}
            className={`${canContact ? "btn-primary" : "btn-secondary"} mt-3 w-full justify-center py-2 text-[14px]`}
          >
            {card.example ? "View profile" : canContact ? "View and message" : "View advert"}
          </Link>
        </li>
      ))}
    </ul>
  );
}
