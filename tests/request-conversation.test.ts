import { test } from "node:test";
import assert from "node:assert/strict";
import { requestMessageBody, requestThreadKey } from "../src/lib/request-message";

test("request message lists what the applicant sent", () => {
  const body = requestMessageBody({
    listingTitle: "Room in Erdington",
    moveInDate: new Date("2026-10-12T00:00:00Z"),
    accommodationNeeds: " Ground floor ",
    supportNeeds: "",
    additionalInfo: "Best number to call: 07700 900123",
  });
  assert.equal(
    body,
    "Hi, I've sent an accommodation request for Room in Erdington.\n\nMove-in date: 12 Oct 2026\nAccommodation needs: Ground floor\n\nBest number to call: 07700 900123",
  );
});

test("request message with no extras is one line", () => {
  assert.equal(requestMessageBody({ listingTitle: "Room A" }), "Hi, I've sent an accommodation request for Room A.");
  assert.equal(requestThreadKey("l1", "u1"), "l1:u1");
});
