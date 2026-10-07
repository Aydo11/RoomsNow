import assert from "node:assert/strict";
import test from "node:test";
import { conversationCounterparty, counterpartyProfileUrl } from "../src/lib/conversation-profile";

test("a provider selects the user over another provider staff member", () => {
  const others = [
    { userId: "colleague", companyId: "provider" },
    { userId: "seeker", companyId: null },
  ];
  assert.equal(conversationCounterparty(others, "provider", true)?.userId, "seeker");
  assert.equal(conversationCounterparty(others, "provider", false)?.userId, "colleague");
});

test("provider message header links to the user's profile, never its own company", () => {
  assert.equal(counterpartyProfileUrl({
    viewerIsProvider: true,
    otherRole: "USER",
    otherUserId: "seeker",
    lookingForAdId: "advert",
    providerSlug: "my-company",
  }), "/people/advert");
  assert.equal(counterpartyProfileUrl({
    viewerIsProvider: true,
    otherRole: "USER",
    otherUserId: "seeker",
    lookingForAdId: null,
    providerSlug: "my-company",
  }), null);
});

test("seeker message header still links to the provider", () => {
  assert.equal(counterpartyProfileUrl({
    viewerIsProvider: false,
    otherRole: "PROVIDER",
    otherUserId: "staff",
    lookingForAdId: null,
    providerSlug: "my-company",
  }), "/companies/my-company");
});
