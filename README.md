# RoomsNow

A UK housing marketplace for HMOs, supported and transitional accommodation, adult social care housing, shared homes and self-contained properties: people looking for housing on one side,
providers advertising rooms on the other, and professionals making referrals between them.

Built as a working base to extend — real database, real auth, real permissions, no mock data
layer. Everything visible in the demo comes out of Postgres.

---

## Running it

```bash
npm install
cp .env.example .env          # set DATABASE_URL and AUTH_SECRET at minimum
npm run setup                 # prisma generate + db push + seed
npm run dev
```

Open http://localhost:3000.

`npm run setup` is destructive — the seed clears the tables it owns before inserting.

### Demo accounts

Password for all of them: `Password123!`

| Role | Email |
| --- | --- |
| Admin | `admin@supportrooms.test` |
| Looking for housing | `jordan@example.test`, `amara@example.test`, `kieran@example.test`, `priya@example.test` |
| Provider | `dan@ashfieldsupported.test`, `hafsa@northgatetrust.test`, `marcus@beaconrecovery.test`, `nadia@harboursideliving.test` |
| Referrer | `referrer@example.test` (Pro plan, 3 clients), `housingoptions@example.test` (Free plan) |

Every organisation, person, address and postcode in the seed is invented.

### Database

`DATABASE_URL` is the runtime connection; `DIRECT_URL` is what schema commands (`db push`,
`migrate`) use. For a single local Postgres they're identical — `.env.example` already sets them
that way. On a hosted database behind a pooler (Neon, Supabase, PgBouncer in transaction mode),
point `DATABASE_URL` at the pooled endpoint and `DIRECT_URL` at the unpooled one, or schema pushes
will fail against a pooler that doesn't support prepared statements.

`GET /api/health` checks the database connection and returns 503 if it's unreachable — point your
host's readiness probe at it instead of `/`, which renders a full page. In development, any query
slower than 200ms is logged to the console (`SLOW_QUERY_THRESHOLD_MS` to change the bar) — the
cheapest way to notice a missing index before it's a production problem.

---

## What's in it

**Public** — home, search with filters and a map view, advert pages with a photo gallery and
room-level availability, provider profiles, the people-looking side of the marketplace, pricing,
how it works, safety, verification, privacy and terms.

**People looking** (`/dashboard`) — profile with granular privacy switches, a "what I'm looking
for" advert, saved properties with availability alerts, requests with a status trail, messages,
notifications, data export and account deletion.

**Providers** (`/provider`) — dashboard with occupancy and analytics, multi-step advert creation,
media manager with captions, room labels, photo/video upload, mobile reordering and a primary image, a room status board, requests and referrals
worklists, membership and billing, company profile and verification.

**Referrers** (`/referrals`) — referral list, a referral form with private document upload, a
per-referral timeline, a client caseload (`/referrals/clients`) for saving the people you support
once and referring or sharing their profile with a provider without re-typing anything, and a
paid referrer plan (`/referrals/membership`) for anyone using this as a real referral stream.

**Providers also see** (`/provider/clients`) — client profiles a referrer has shared with them: a
heads-up with contact details, not an application, revocable by the referrer at any time.

**Admin** (`/admin`) — advert approval queue, verification review, reports, users, providers,
requests, referrals, memberships and payments, support categories, and an audit log.

---

## How it's put together

```
prisma/schema.prisma      All models and enums
prisma/seed.ts            Demo data
src/brand.config.ts       Name, tagline, trust wording — rename the product here
src/lib/                  db, session, rbac, audit, validation, taxonomy, format, matching
src/lib/{storage,billing,notify}.ts   Adapters for external services
src/server/actions/       Server Actions, one file per domain
src/server/search.ts      Search queries for both sides of the marketplace
src/app/(site)/           All pages
src/app/api/              Private document serving, billing webhook
```

- **Next.js 16 App Router**, TypeScript, Tailwind. Mutations are Server Actions, not REST.
- **Auth** is bcrypt plus a signed JWT (`jose`) in an httpOnly cookie. No NextAuth.
- **Permissions** live in `src/lib/rbac.ts`. Pages call `requireUser` / `requireCompany` /
  `requireReferrer` / `requireAdmin`; actions re-check ownership before writing.
- **Validation** is Zod, in `src/lib/validation.ts`, shared between actions and forms.
- **Money is stored in pence** everywhere.
- **Support categories are database rows**, editable by admins, not hard-coded strings.

### Search

Built for a catalogue in the thousands rather than the dozens:

- Free text matches across title, summary, description, support blurb, town, area and provider
  name. Every word has to appear somewhere, so extra words narrow rather than widen.
- A town or postcode is geocoded and becomes a **radius search** (1–100 miles), with distance shown
  on each result. If geocoding fails it falls back to a name match.
- The map is real Leaflet with OpenStreetMap tiles, price pins, clustering at low zoom, and a
  **search this area** button that turns the viewport into a `bbox` filter.
- Refinement chips carry **counts**, so nobody has to guess which filter will empty the results.
- Pagination is windowed and capped at 40 pages; past that the interface asks people to narrow down
  rather than paging into the hundreds.
- If the catalogue outgrows this, `textFilter()` in `src/server/search.ts` is the single function to
  replace with a tsvector column or a search service. Nothing outside it needs to change.

### Sponsored placement

- Search uses four explicit lanes: active boosts, active sponsored placements, other paid-member
  adverts, then free adverts. An active promoted advert is never mixed into the free lane.
- Sponsored adverts fill up to three labelled slots at the top of **page one only**. The eligible
  pool rotates hourly, so every active sponsor shares the visible positions regardless of package length.
- They still have to match the query. Paying can't put an advert in front of someone it doesn't fit.
- Buying again extends the end date rather than replacing it. Expiry is enforced in the query,
  not by a cron job.
- Impressions are counted where they're shown, clicks via `?ref=sponsored` on the advert link, and
  both appear in the provider's sponsor panel.
- Paying changes nothing about verification, moderation, or whether an advert is approved.

### 24-hour boosts

- A provider can spend one boost on any live advert. It receives newest-boost priority for three
  hours, then rotates hourly with the other active boosts until its real 24-hour countdown ends.
- Boost packs are one-off Stripe payments: 1 for £5, 3 for £10 or 10 for £30. Purchased credits do
  not expire. Professional includes three per billing period and Business includes one.
- Stripe Checkout can use `STRIPE_PRICE_BOOST_1`, `STRIPE_PRICE_BOOST_3` and
  `STRIPE_PRICE_BOOST_10`; if they are blank, Checkout creates equivalent one-off price data.
- Credits are granted only by the signed `checkout.session.completed` webhook. Webhook retries are
  idempotent, and credit use is protected by a serializable database transaction.

### Swapping the external services

Each adapter picks a driver from an env var and exposes one interface, so nothing else changes:

| Concern | File | Drivers |
| --- | --- | --- |
| File storage | `src/lib/storage.ts` | `local` (default), AWS S3 or an S3-compatible service such as Cloudflare R2 |
| Billing | `src/lib/billing.ts` | local mock, Stripe Checkout + Customer Portal in production |
| Email / SMS | `src/lib/notify.ts` | `console` (default), `resend`, `twilio` |
| Map tiles | `src/components/map-view.tsx` | OpenStreetMap by default; set `NEXT_PUBLIC_MAP_TILE_URL` for a paid provider |
| Geocoding | `src/lib/geo.ts` | `postcodes` (postcodes.io, free, UK) or `none` |

Prices in the seed are placeholders.

### Production media and traffic

Render's local filesystem is temporary. It is fine for testing but uploaded media can disappear
after a deploy or restart. Before inviting real providers, create an S3/R2 bucket and set
`STORAGE_DRIVER=s3` plus the `S3_*` values shown in `.env.example`. Public media should be served
through the bucket's public/CDN URL; private evidence stays inaccessible and is fetched through the
permission-checked document route.

For more than one web instance, create an Upstash Redis database and set
`RATE_LIMIT_DRIVER=upstash`, `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. This makes
login, messaging and upload limits consistent across every instance. Database indexes cover the
main listing, availability and media queries, and repeated advert views are de-duplicated for 30
minutes to avoid a write on every refresh.

### Sign-in, email verification, password reset and payments

- Google sign-in works for an existing RoomsNow account whose email is verified by Google.
  Create OAuth web credentials, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and add
  `https://www.roomsnow.co.uk/api/auth/google/callback` as an authorised redirect URI. Set
  `APP_URL=https://www.roomsnow.co.uk` so the callback address matches exactly.
- New password accounts must confirm a hashed, single-use email link before signing in. Links
  expire after 24 hours and can be resent without revealing whether an account exists. Configure
  `EMAIL_DRIVER=resend`, `RESEND_API_KEY` and a domain-verified `EMAIL_FROM`; the `console` driver
  is development-only and cannot deliver a link to a real user.
- Forgotten-password links are hashed in the database, expire after one hour and can only be used
  once. Set `EMAIL_DRIVER=resend`, `RESEND_API_KEY` and a verified `EMAIL_FROM` address for delivery.
- Set `BILLING_DRIVER=stripe`, the Stripe secret/webhook secrets, membership Price IDs and optional
  boost-pack Price IDs. Point the Stripe webhook at `https://YOUR-DOMAIN/api/billing/webhook` and subscribe it to
  `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`,
  `invoice.paid` and `invoice.payment_failed`. Paid memberships, boost packs and sponsored adverts are activated
  only by a signed webhook. Production will not fall back to fake payments.

---

## Security

See [SECURITY.md](SECURITY.md) for the full picture — controls in place and the
honest list of what still needs doing before real data goes near it.

The short version: bcrypt + signed-JWT sessions with revocation, RBAC enforced
next to the data rather than in middleware, private files stored outside the web
root and served only through a permission-checked audited route, uploads verified
by magic bytes, `sanitize-html` on the one HTML input, CSP and HSTS headers,
rate limiting on every abusable action, one-hour single-use password resets, and no raw SQL anywhere.
Missing: MFA for administrator accounts.

## Privacy decisions worth knowing

These are deliberate, and changing them changes the product:

- Profiles are private by default. Providers only see someone in the people search if that person
  turns on "let providers find me".
- Advert addresses show the town and outward postcode only, unless the provider opts into
  publishing the full address.
- Referral detail is visible to the referrer, the receiving provider, and admins. Nobody else.
- Admins can moderate accounts and content but **cannot read message bodies**.
- Private documents (referral attachments, verification evidence) are never linked from storage.
  Every read goes through `/api/documents/[id]`, which checks permissions and writes an audit entry.
- Deleting an account soft-deletes it and blanks the profile immediately; a minimal record is kept
  briefly so providers can close their side.

## Trust wording

The verified badge means a person on the admin team checked documents confirming who a provider is.
It is not a regulatory registration or an inspection, and the copy on `/verification` says so.
Match percentages are a search convenience, not an eligibility or clinical judgement. Promoted
adverts are always labelled. Keep all three of those honest if you extend this.

---

## Things left for you

- Email templates (notifications currently log to the console).
- Configure S3/R2, Upstash and the production notification drivers.
- Configure Stripe products, webhook signing and Resend before accepting payment or password resets.
- A tile provider for the map if you want a basemap rather than plotted coordinates.
- Tests. There are none.
- MFA for administrator accounts (see SECURITY.md).
- Automated unit, integration, accessibility and load tests in CI.
