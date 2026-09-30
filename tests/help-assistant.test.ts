import test from "node:test";
import assert from "node:assert/strict";
import {
  advertAnswer,
  buildSearchUrl,
  detectSafety,
  extractSearch,
  findSensitive,
  isAllowedHref,
  isSearchIntent,
  parseModelReply,
  redact,
  respond,
  type AdvertFacts,
  type SearchContext,
} from "../src/lib/assistant/engine";
import { HELP_ARTICLES, STARTERS } from "../src/lib/assistant/knowledge";

const context: SearchContext = {
  areas: ["Birmingham", "Manchester", "Leeds"],
  supportTypes: [
    { slug: "mental-health", label: "Mental health" },
    { slug: "substance-misuse", label: "Substance misuse" },
    { slug: "care-leavers", label: "Care leavers" },
    { slug: "ex-offenders", label: "Prison leavers" },
  ],
};
const today = new Date("2026-09-30T12:00:00Z");
const ask = (content: string, extra: Partial<Parameters<typeof respond>[0]> = {}) =>
  respond({ messages: [{ role: "user", content }], facts: null, context, today, ...extra });

const facts: AdvertFacts = {
  id: "abc123", title: "Room in Handsworth", rentFrom: 120, rentTo: 150, billsIncluded: true, housingBenefit: true,
  availableFrom: null, roomsAvailable: 2, city: "Birmingham", area: "Handsworth", accommodationType: "SHARED_ACCOMMODATION",
  supportLabels: ["Mental health"], supportDescription: "Weekly key-work sessions.", supportAvailability: "Mon–Fri",
  eligibility: "Men 25+ with low support needs.", genderArrangement: "MALE_ONLY", minAge: 25, maxAge: null,
  furnished: true, ensuite: false, selfContained: false, wheelchairAccess: false, petsAllowed: false, referralProcess: null,
  providerName: "Valor Housing",
};

test("starter questions all get a useful answer offline", async () => {
  for (const question of STARTERS) {
    const reply = await ask(question);
    assert.notEqual(reply.kind, "unknown", question);
    assert.ok(reply.text.length > 40, question);
  }
});

test("safety: danger and self-harm get 999, never a model answer", async () => {
  assert.equal(detectSafety("I'm in danger, someone is outside my door"), "danger");
  assert.equal(detectSafety("i want to kill myself"), "suicide");
  assert.equal(detectSafety("I'm fleeing domestic abuse"), "abuse");
  assert.equal(detectSafety("I'm sleeping rough tonight"), "roofless");
  assert.equal(detectSafety("Do you have emergency accommodation in Leeds?"), null);
  let called = false;
  const reply = await ask("I'm not safe right now", { ai: async () => ((called = true), null) });
  assert.equal(reply.kind, "safety");
  assert.match(reply.text, /999/);
  assert.match(reply.text, /automated assistant/);
  assert.equal(called, false);
});

test("room request asks for an area, then links to live results", async () => {
  const first = await ask("I need a room");
  assert.equal(first.kind, "search");
  assert.equal(first.state?.awaiting, "area");
  assert.equal(first.links.length, 0);
  const second = await respond({
    messages: [{ role: "user", content: "I need a room" }, { role: "assistant", content: first.text }, { role: "user", content: "Wolverhampton" }],
    state: first.state, facts: null, context, today,
  });
  assert.equal(second.kind, "search");
  assert.equal(second.links[0].href, "/search?where=Wolverhampton");
  assert.match(second.text, /can't promise/);
});

test("search details are understood and turned into filters", () => {
  const draft = extractSearch("Looking for a room in Leeds for a care leaver, on universal credit, under £150 a week, from next week", context, today);
  assert.equal(draft.where, "Leeds");
  assert.deepEqual(draft.support, ["care-leavers"]);
  assert.equal(draft.hb, true);
  assert.equal(draft.maxRent, 150);
  assert.equal(draft.from, "2026-10-07");
  assert.equal(buildSearchUrl(draft), "/search?where=Leeds&support=care-leavers&maxRent=150&hb=1&from=2026-10-07");
  assert.equal(extractSearch("rooms near B21 9ES", context, today).where, "B21 9ES");
  assert.equal(extractSearch("£600 pcm", context, today).maxRent, 138);
  assert.equal(isSearchIntent("How do I find a room?"), false);
  assert.equal(isSearchIntent("any rooms in Birmingham?"), true);
});

test("refining an existing search keeps the area", async () => {
  const first = await ask("show me rooms in Manchester");
  const second = await respond({
    messages: [{ role: "user", content: "Only homes that accept Housing Benefit" }],
    state: first.state, facts: null, context, today,
  });
  assert.equal(second.links[0].href, "/search?where=Manchester&hb=1");
});

test("advert questions are answered from the live advert, with the caveat", async () => {
  const reply = await ask("What's included in the rent?", { facts });
  assert.equal(reply.kind, "advert");
  assert.match(reply.text, /£120 to £150/);
  assert.match(reply.text, /bills are included/);
  assert.match(reply.text, /check the details with the provider/);
  const who = advertAnswer(facts, ["eligibility"]);
  assert.match(who.text, /men only/);
  assert.match(who.text, /Only the provider can decide/);
  const none = advertAnswer({ ...facts, roomsAvailable: 0 }, ["availability"]);
  assert.match(none.text, /doesn't show any rooms marked available/);
});

test("unknown questions say so and offer support", async () => {
  const reply = await ask("What's the capital of Peru?");
  assert.equal(reply.kind, "unknown");
  assert.equal(reply.handoff, true);
});

test("sensitive details are flagged and removed before anything else sees them", async () => {
  assert.deepEqual(findSensitive("my NI number is QQ 12 34 56 C"), ["National Insurance number"]);
  assert.ok(!redact("card 4111 1111 1111 1111 please").includes("4111"));
  let seen = "";
  const reply = await ask("How do I delete my account? my NI is QQ123456C", { ai: async (_s, messages) => ((seen = messages.at(-1)!.content), null) });
  assert.match(reply.text, /^Please don't share/);
  assert.ok(!seen.includes("QQ123456C"));
});

test("model replies are parsed defensively and links are whitelisted", async () => {
  const parsed = parseModelReply('Sure! {"reply":"Open Settings.","links":[{"label":"Settings","href":"/dashboard/settings"},{"label":"Evil","href":"https://evil.example"},{"label":"Admin","href":"/admin"}],"suggestions":["x"],"handoff":false}');
  assert.ok(parsed);
  assert.deepEqual(parsed.links.map((l) => l.href), ["/dashboard/settings"]);
  assert.equal(parseModelReply("not json"), null);
  assert.equal(isAllowedHref("//evil.example"), false);
  assert.equal(isAllowedHref("/listings/abc#message"), true);
  const viaAi = await ask("Can I change my email address?", { ai: async () => '{"reply":"Rooms are available now.","links":[],"suggestions":[]}' });
  assert.equal(viaAi.source, "ai");
  assert.match(viaAi.text, /check the details with the provider/);
});

test("every article link is allowed", () => {
  for (const article of HELP_ARTICLES) for (const link of article.links) assert.ok(isAllowedHref(link.href), link.href);
});
