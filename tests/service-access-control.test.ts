import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { isPaidProviderCompany, marketplaceAccess } from "../src/lib/service-marketplace";
import { poundsToPence, quoteRequestSchema, serviceAdvertSchema, serviceEvidenceSchema, splitPlaces, splitPostcodes } from "../src/lib/service-validation";

const paid = { priceMonthly: 4900, priceYearly: null };
const free = { priceMonthly: 0, priceYearly: null };

test("paid provider: paid subscription or paid admin grant, never free or suspended", () => {
  assert.equal(isPaidProviderCompany({ status: "ACTIVE", subscription: { status: "ACTIVE", membership: paid }, membershipGrants: [] }), true);
  assert.equal(isPaidProviderCompany({ status: "ACTIVE", subscription: { status: "PAST_DUE", membership: paid }, membershipGrants: [] }), true);
  assert.equal(isPaidProviderCompany({ status: "ACTIVE", subscription: { status: "ACTIVE", membership: free }, membershipGrants: [] }), false);
  assert.equal(isPaidProviderCompany({ status: "ACTIVE", subscription: { status: "CANCELLED", membership: paid }, membershipGrants: [] }), false);
  assert.equal(isPaidProviderCompany({ status: "ACTIVE", subscription: { status: "INCOMPLETE", membership: paid }, membershipGrants: [] }), false);
  assert.equal(isPaidProviderCompany({ status: "ACTIVE", subscription: { status: "ACTIVE", membership: free }, membershipGrants: [{ membership: paid }] }), true);
  assert.equal(isPaidProviderCompany({ status: "ACTIVE", subscription: null, membershipGrants: [{ membership: free }] }), false);
  assert.equal(isPaidProviderCompany({ status: "SUSPENDED", subscription: { status: "ACTIVE", membership: paid }, membershipGrants: [] }), false);
  assert.equal(isPaidProviderCompany(null), false);
  // A free provider only ever gets the preview.
  assert.equal(marketplaceAccess({ role: "PROVIDER", paidProvider: isPaidProviderCompany({ status: "ACTIVE", subscription: { status: "ACTIVE", membership: free }, membershipGrants: [] }), isAdmin: false }), "preview");
});

/**
 * Guard against a future action forgetting its permission check: every
 * exported server action in the marketplace files must call the right gate
 * before touching the database.
 */
function exportedActions(path: string) {
  const source = readFileSync(path, "utf8");
  const bodies: Array<{ name: string; body: string }> = [];
  const pattern = /export async function (\w+)\([^)]*\)[^{]*\{/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const start = match.index + match[0].length;
    const next = source.indexOf("\nexport ", start);
    bodies.push({ name: match[1], body: source.slice(start, next === -1 ? undefined : next) });
  }
  return bodies;
}

test("every service-business action requires the signed-in business first", () => {
  const actions = exportedActions("src/server/actions/service-business.ts");
  assert.ok(actions.length >= 12);
  for (const { name, body } of actions) {
    const gate = body.indexOf("requireServiceBusiness()");
    const firstDb = body.indexOf("db.");
    assert.ok(gate !== -1, `${name} must call requireServiceBusiness`);
    assert.ok(firstDb === -1 || gate < firstDb, `${name} must check access before reading data`);
  }
});

test("every buyer action requires a paid accommodation provider first", () => {
  const actions = exportedActions("src/server/actions/service-buyer.ts");
  assert.ok(actions.length >= 5);
  for (const { name, body } of actions) {
    const gate = body.indexOf("assertPaidProvider(user)");
    const firstDb = body.indexOf("db.");
    assert.ok(gate !== -1, `${name} must call assertPaidProvider`);
    assert.ok(firstDb === -1 || gate < firstDb, `${name} must check access before reading data`);
  }
});

test("admin decisions need the right admin permission; evidence needs full admin", () => {
  const actions = exportedActions("src/server/actions/service-admin.ts");
  for (const { name, body } of actions) assert.match(body, /requireAdmin\("(ALL|MODERATION)"\)/, name);
  const byName = Object.fromEntries(actions.map((a) => [a.name, a.body]));
  assert.match(byName.reviewServiceBusinessAction, /requireAdmin\("ALL"\)/);
  assert.match(byName.reviewServiceEvidenceAction, /requireAdmin\("ALL"\)/);
  const evidenceRoute = readFileSync("src/app/api/service-evidence/[id]/route.ts", "utf8");
  assert.match(evidenceRoute, /hasAdminPermission\(user, "ALL"\)/);
  assert.match(evidenceRoute, /service_evidence\.viewed/);
});

test("service accounts can't start conversations or apply for rooms", () => {
  const engagement = readFileSync("src/server/actions/engagement.ts", "utf8");
  for (const action of ["startConversationAction", "startDirectMessageAction", "createRequestAction"]) {
    const start = engagement.indexOf(`export async function ${action}`);
    const body = engagement.slice(start, engagement.indexOf("\nexport ", start + 10));
    assert.match(body, /user\.role === "SERVICE_PROVIDER"\) return/, action);
  }
});

test("the free preview renders only redacted cards", () => {
  const page = readFileSync("src/app/(site)/services/page.tsx", "utf8");
  const preview = page.slice(page.indexOf('if (access === "preview")'), page.indexOf("// Full access."));
  assert.match(preview, /\.map\(previewCard\)/);
  for (const leak of ["ServiceAdvertCard", ".title", ".name", "displayName", ".email", ".phone", ".description", ".image", ".website", ".logoUrl"]) {
    assert.ok(!preview.includes(leak), `preview branch must not reference ${leak}`);
  }
});

test("form parsing: places, postcodes, money", () => {
  assert.deepEqual(splitPlaces("Walsall, walsall\nDudley;  West  Bromwich"), ["Walsall", "Dudley", "West Bromwich"]);
  assert.deepEqual(splitPostcodes("ws1, b21 9qx, nonsense, 123"), ["WS1", "B219QX"]);
  assert.equal(poundsToPence("£1,250.50"), 125050);
  assert.equal(poundsToPence(""), null);
  assert.ok(Number.isNaN(poundsToPence("12.345")));
});

test("advert, evidence and quote validation", () => {
  const advert = {
    title: "Gas safety certificates",
    category: "gas-heating",
    subcategory: "Gas safety certificates",
    description: "x".repeat(80),
    locations: ["Walsall"],
    nationwide: false,
    priceType: "FIXED",
    priceFrom: 6000,
    priceTo: null,
    priceUnit: "",
    availability: "",
    emergency: false,
    sameDay: false,
    qualifications: "",
    website: "",
  };
  assert.ok(serviceAdvertSchema.safeParse(advert).success);
  assert.ok(!serviceAdvertSchema.safeParse({ ...advert, category: "nonsense" }).success);
  assert.ok(!serviceAdvertSchema.safeParse({ ...advert, subcategory: "Bed bugs" }).success);
  assert.ok(!serviceAdvertSchema.safeParse({ ...advert, locations: [] }).success);
  assert.ok(serviceAdvertSchema.safeParse({ ...advert, locations: [], nationwide: true }).success);
  assert.ok(!serviceAdvertSchema.safeParse({ ...advert, priceFrom: null }).success);
  assert.ok(!serviceAdvertSchema.safeParse({ ...advert, priceType: "RANGE", priceTo: 5000 }).success);
  assert.ok(!serviceAdvertSchema.safeParse({ ...advert, website: "javascript:alert(1)" }).success);

  const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  assert.ok(serviceEvidenceSchema.safeParse({ type: "PUBLIC_LIABILITY", label: "PL £5m", issuer: "", reference: "", expiresAt: future }).success);
  assert.ok(!serviceEvidenceSchema.safeParse({ type: "PUBLIC_LIABILITY", label: "PL £5m", issuer: "", reference: "", expiresAt: null }).success);
  assert.ok(!serviceEvidenceSchema.safeParse({ type: "QUALIFICATION", label: "Gas Safe", issuer: "", reference: "", expiresAt: new Date(Date.now() - 1000) }).success);
  assert.ok(serviceEvidenceSchema.safeParse({ type: "INCORPORATION", label: "Certificate", issuer: "", reference: "", expiresAt: null }).success);

  const quote = { service: "EICR", location: "Walsall", preferredDate: null, urgency: "FLEXIBLE", description: "Five-bed HMO needs an EICR before renewal.", budgetMin: 10000, budgetMax: 20000 };
  assert.ok(quoteRequestSchema.safeParse(quote).success);
  assert.ok(!quoteRequestSchema.safeParse({ ...quote, budgetMax: 5000 }).success);
  assert.ok(!quoteRequestSchema.safeParse({ ...quote, description: "fix it" }).success);
});
