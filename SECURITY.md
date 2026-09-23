# Security

This file is the honest version: what the codebase actually does, and what it
doesn't do yet. Read the second list before putting real people's data in it.

## What we're protecting

Supported accommodation data is unusually sensitive. Support needs reveal health
information, referral attachments contain risk assessments, and a resident's
address is sometimes the thing keeping them safe from someone. The realistic
threats are: an attacker enumerating referral documents, a provider seeing an
applicant they were never referred, someone finding a woman's refuge move-on
address, and account takeover through credential stuffing.

## Controls in place

**Authentication.** bcrypt at cost 12. Sessions are signed JWTs (HS256, `jose`)
in an httpOnly, SameSite=Lax, Secure-in-production cookie, and `AUTH_SECRET` must
be at least 32 characters or the app refuses to start. Every request re-reads the
user from the database, so a suspended or deleted account loses access
immediately rather than when its token expires.

**Session revocation.** `User.tokenVersion` is embedded in the token and checked
on every request. Changing a password, using "sign out everywhere", being
suspended by an admin, or deleting an account all increment it, killing every
outstanding session including stolen ones.

**Login hardening.** Failed logins are rate-limited twice — per source address
and per account — so neither a scattergun nor a slow grind against one inbox
works. The response is identical whether or not the email exists, and a dummy
bcrypt comparison runs when it doesn't, so response timing doesn't leak
registration status either. The post-login `next` parameter is validated against
protocol-relative and backslash tricks, not just a leading slash.

**Email ownership.** New password accounts cannot sign in until they follow a
hashed, single-use verification link delivered to the supplied mailbox. Links
expire after 24 hours, resends are rate-limited, and resend responses do not
reveal whether an account exists. Existing accounts created before this control
was introduced remain accessible; administrators can review them separately.
Google sign-in accepts only an identity token whose email is verified by Google.

**Authorisation.** Enforced in `src/lib/rbac.ts`, next to the data, not in
middleware — a matcher is too easy to bypass with a route it doesn't cover. Pages
call `requireUser` / `requireCompany` / `requireReferrer` / `requireAdmin`, and
every mutating action independently re-checks ownership before it writes. Object
ids are cuids, but nothing relies on them being unguessable.

**Private files.** This is the one worth understanding. Referral attachments and
verification evidence are written **outside the web root** (`PRIVATE_UPLOAD_DIR`,
default `./var/private-uploads`) and stored with a `private:` key rather than a
URL. The only way to read one is `GET /api/documents/[id]`, which checks that the
caller is the referrer, the receiving provider, the applicant, or an admin, then
writes an audit entry. Responses carry `nosniff`, a sandbox CSP, `no-store`, and
`Content-Disposition: attachment` for anything that isn't an image or PDF.
Middleware refuses to serve `/uploads/referrals/*` or `/uploads/verification/*`
as a second lock. Document reads are rate-limited to stop id enumeration.

**Uploads.** MIME and size are checked, then the first bytes are checked against
the format's signature, so a file claiming to be a PNG has to actually be one.
Stored filenames are generated UUIDs — never derived from user input — and the
resolved path is asserted to stay inside its root, so path traversal fails twice.

**Injection.** All database access goes through Prisma with parameterised
queries; there is no raw SQL anywhere in the codebase. The single place users can
submit HTML (the advert description) goes through `sanitize-html` with a tag
allow-list and **no** permitted attributes, so there's no href, style, or event
handler to smuggle anything through. Everything else is rendered as JSX text,
which React escapes.

**CSRF.** Mutations are Server Actions, which Next rejects unless the Origin
header matches; `allowedOrigins` is pinned to `APP_URL` in `next.config.mjs`. The
one custom POST route (the billing webhook) verifies Stripe's signature against the raw request body.

**Headers.** CSP, HSTS (production), `X-Frame-Options: DENY`,
`frame-ancestors 'none'`, `nosniff`, a restrictive `Permissions-Policy`, and
`Referrer-Policy: strict-origin-when-cross-origin`. `X-Powered-By` is off.

**Rate limiting.** `src/lib/rate-limit.ts`, applied to login, registration,
password changes, messages, requests, referrals, reports, uploads and document
reads. The default driver is in-process, which is real protection on one instance
and none across several. Set `RATE_LIMIT_DRIVER=upstash` with the two Upstash REST
credentials in `.env.example` before scaling out.

**Audit.** Consequential actions are logged with actor, target and IP, including
admin actions and every private document read. Admins can moderate accounts but
**cannot read message bodies** — that's enforced in the queries, not by policy.

**Privacy by default.** Profiles are invisible until the person opts in.
Addresses show town and outward postcode unless the provider publishes more. Map
pins sit on the postcode, not the door.

**Referral sharing accountability.** New professional referrals require the
referrer to select the Article 6 basis their organisation has assessed and
confirm data minimisation, transparency and any additional condition/safeguards
for special-category or criminal-offence information. The selected basis,
timestamp and privacy-notice version are stored on the referral and in its
creation audit event. This is only the referrer's declaration: RoomsNow does not
verify that the basis, Article 9 condition or DPA 2018 Schedule 1 condition is
valid. Historical referrals have no retroactive declaration.

## Not done yet — do these before real data

1. **No MFA.** Admin accounts especially should have TOTP.
2. **Shared rate limiting must be configured.** The Upstash driver is implemented,
   but production remains per-instance until its environment variables are set.
3. **The password deny-list is ten entries.** Replace it with a k-anonymity
   lookup against Have I Been Pwned's range API.
4. **CSP allows `'unsafe-inline'` for scripts.** Move to a per-request nonce and
   add a reporting endpoint.
5. **No dependency scanning or CI.** Add `npm audit`, Dependabot and a secret
   scanner.
6. **No encryption at rest beyond the database's own.** Referral attachments are
   plain files on disk. Consider envelope encryption for the private bucket.
7. **No penetration test.** Nothing here has been tested by anyone but its
   author. For a service holding this kind of data, get one.
8. **Retention is not enforced end to end.** Account deletion sets a 30-day
   `retainUntil` marker but there is no scheduled purge job. The privacy notice
   now describes published timeframes as review targets and discloses that
   automated deletion and backup expiry are not fully enforced. Implement and
   monitor a tested retention job before accepting sensitive production data.
9. **Logging goes to the console.** Ship it somewhere durable, and make sure it
    never captures message bodies or referral contents.
10. **No completed DPIA / ROPA / processor pack is included in the repository.**
    Complete a data protection impact assessment, records of processing, lawful
    basis and special-category condition register, processor contracts, transfer
    assessments and a tested rights-request/incident process with the controller
    before launch. The referral declaration feature does not replace any of
    these governance records.
11. **Rights workflows are incomplete.** Self-service export, correction and
    deletion exist, but the export should be checked for completeness per role,
    third-party information and attachments; erasure exceptions and outcomes
    need a case-managed human review. Do not treat account deletion as erasure
    of every related legal, safety or third-party record.

## Reporting

Report suspected security issues privately to `info@roomsnow.co.uk`. Do not send
passwords, identity documents or sensitive client information in the first email.
