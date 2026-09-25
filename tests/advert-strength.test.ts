import assert from "node:assert/strict";
import test from "node:test";
import { advertStrength, type AdvertStrengthInput } from "../src/lib/advert-strength";

const empty: AdvertStrengthInput = {
  id: "listing1",
  summary: null,
  description: null,
  weeklyRentFrom: null,
  availableFrom: null,
  minAge: null,
  maxAge: null,
  accessibilityNotes: null,
  wheelchairAccess: false,
  supportTypes: [],
  supportDescription: null,
  referralRoutes: [],
  referralProcess: null,
  houseRules: null,
  media: [],
};

const complete: AdvertStrengthInput = {
  ...empty,
  summary: "Quiet five-bed shared house close to the city centre",
  description: "x".repeat(400),
  weeklyRentFrom: 15000,
  availableFrom: new Date("2026-10-01"),
  minAge: 18,
  maxAge: 65,
  accessibilityNotes: "Ground-floor room with level access",
  supportTypes: ["mental-health"],
  supportDescription: "Key worker visits twice a week, with a support plan reviewed every month.",
  referralRoutes: ["COUNCIL"],
  referralProcess: "Send a referral and we will call within two working days.",
  houseRules: "No smoking indoors. Visitors until 10pm.",
  media: [...Array.from({ length: 6 }, () => ({ type: "IMAGE" })), { type: "VIDEO_URL" }],
};

test("checks add up to exactly 100 points", () => {
  const total = advertStrength(empty).checks.reduce((sum, check) => sum + check.points, 0);
  assert.equal(total, 100);
});

test("an empty advert scores 0 and needs work", () => {
  const result = advertStrength(empty);
  assert.equal(result.score, 0);
  assert.equal(result.band, "needs-work");
  assert.equal(result.todo[0].key, "photos");
});

test("a complete advert scores 100 with nothing left to do", () => {
  const result = advertStrength(complete);
  assert.equal(result.score, 100);
  assert.equal(result.band, "excellent");
  assert.equal(result.todo.length, 0);
});

test("photos and description earn partial credit", () => {
  const result = advertStrength({ ...empty, media: [{ type: "IMAGE" }, { type: "IMAGE" }], description: "x".repeat(150) });
  const photos = result.checks.find((check) => check.key === "photos")!;
  const description = result.checks.find((check) => check.key === "description")!;
  assert.equal(photos.earned, 8);
  assert.equal(photos.label, "Add 3 more photos");
  assert.equal(description.earned, 8);
});

test("a video counts only once, and documents don't count as photos", () => {
  const result = advertStrength({ ...empty, media: [{ type: "VIDEO" }, { type: "VIDEO_URL" }, { type: "DOCUMENT" }] });
  assert.equal(result.checks.find((check) => check.key === "video")!.earned, 10);
  assert.equal(result.checks.find((check) => check.key === "photos")!.earned, 0);
});

test("tips link to the right place", () => {
  const result = advertStrength(empty);
  assert.equal(result.checks.find((check) => check.key === "photos")!.href, "/provider/adverts/listing1/media");
  assert.equal(result.checks.find((check) => check.key === "rules")!.href, "/provider/adverts/listing1/edit?step=4");
});
