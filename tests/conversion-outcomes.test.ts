import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/analytics/outcome/route";
import { isNewHousingEnquiry, outcomeDocument, readOutcomes, sealOutcomes, type ConversionOutcome } from "../src/lib/conversion-outcomes";

const secret = "test-secret-for-completed-outcomes-at-least-32-characters";
const event: ConversionOutcome = { id: "3f1d2433-8318-46d3-874d-50012705d900", event: "sign_up" };

test("success proofs reject tampering, expiration and different secrets", async () => {
  const now = new Date("2026-10-22T10:00:00Z");
  const token = await sealOutcomes([event], secret, now);
  assert.deepEqual(await readOutcomes(token, secret, now), [event]);
  assert.deepEqual(await readOutcomes(token.slice(0, -8) + "tampered", secret, now), []);
  assert.deepEqual(await readOutcomes(token, "another-key", now), []);
  assert.deepEqual(await readOutcomes(token, secret, new Date(now.getTime() + 301000)), []);
  assert.deepEqual(await readOutcomes(undefined, secret), []);
  assert.deepEqual(await readOutcomes("not-a-jwt", secret), []);
});

test("proofs cannot carry arbitrary event names or personal fields", async () => {
  for (const bad of [{ ...event, event: "page_view" }, { ...event, email: "private@example.com" }]) {
    assert.deepEqual(await readOutcomes(await sealOutcomes([bad as ConversionOutcome], secret), secret), []);
  }
});

test("only a first successful housing enquiry qualifies as a lead", () => {
  assert.equal(isNewHousingEnquiry("USER", true, false), true);
  assert.equal(isNewHousingEnquiry("REFERRER", true, false), true);
  for (const role of ["ADMIN", "PROVIDER", "SERVICE_PROVIDER"]) assert.equal(isNewHousingEnquiry(role, true, false), false);
  assert.equal(isNewHousingEnquiry("USER", true, true), false);
  assert.equal(isNewHousingEnquiry("USER", false, false), false);
});

function runDocument(cookie: string, storage = new Map<string, string>()) {
  const loaded: unknown[] = [];
  const context: Record<string, any> = { document: {
    cookie, head: { appendChild: (script: unknown) => loaded.push(script) }, createElement: () => ({}),
  }, sessionStorage: { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value) } };
  context.window = context;
  const html = outcomeDocument([event], "https://www.roomsnow.co.uk/private?email=private@example.com");
  assert.doesNotMatch(html, /private@example|\/private\?|parent\.|top\./);
  context.document.getElementById = () => ({ textContent: html.match(/id="completed-outcomes">([\s\S]*?)<\/script>/)![1] });
  vm.runInNewContext(readFileSync(new URL("../public/conversion-outcome.js", import.meta.url), "utf8"), context);
  return { loaded, commands: (context.dataLayer ?? []).map((args: IArguments) => Array.from(args)) };
}

test("consent required; success events are deduplicated without sending IDs or private URLs", () => {
  assert.equal(runDocument("").loaded.length, 0);
  assert.equal(runDocument("rn_analytics_choice=rejected").loaded.length, 0);
  const storage = new Map<string, string>();
  const result = runDocument("rn_analytics_choice=accepted", storage);
  assert.equal(result.loaded.length, 1);
  const commands = result.commands;
  const successes = commands.filter((args: unknown[]) => args[0] === "event");
  assert.equal(successes.length, 1);
  assert.equal(successes[0][1], "sign_up");
  assert.equal(successes[0][2].page_location, "https://www.roomsnow.co.uk/");
  assert.equal(successes[0][2].page_referrer, "");
  assert.doesNotMatch(JSON.stringify(commands), new RegExp(event.id));
  assert.equal(runDocument("rn_analytics_choice=accepted", storage).loaded.length, 0);
});

test("relay requires a signed success, consent and a same-origin iframe; responses are not cached", async () => {
  const previous = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = secret;
  try {
    const token = await sealOutcomes([event], secret);
    const request = (consent: string, site = "same-origin", destination = "iframe", proof = token) => new NextRequest("https://www.roomsnow.co.uk/api/analytics/outcome", { headers: {
      cookie: `rn_analytics_choice=${consent}; rn_completed_actions=${proof}`,
      "sec-fetch-site": site, "sec-fetch-dest": destination,
    } });
    for (const input of [request("rejected"), request("accepted", "cross-site"), request("accepted", "same-origin", "document"), request("accepted", "same-origin", "iframe", "forged")]) {
      const response = await GET(input);
      assert.equal(response.status, 204);
      assert.doesNotMatch(await response.text(), /googletagmanager/);
    }
    const response = await GET(request("accepted"));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control")!, /no-store/);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.match(response.headers.get("content-security-policy")!, /frame-ancestors 'self'/);
    assert.match(response.headers.get("set-cookie")!, /rn_completed_actions=;.*Max-Age=0/i);
  } finally { if (previous === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = previous; }
});
