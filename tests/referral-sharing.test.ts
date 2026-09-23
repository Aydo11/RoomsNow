import assert from "node:assert/strict";
import test from "node:test";
import { referralSchema } from "../src/lib/validation";

const validReferral = {
  applicantFirstName: "Sam",
  applicantLastName: "Example",
  organisation: "Example Council",
  dataSharingBasis: "PUBLIC_TASK",
  dataSharingConfirmed: "on",
  specialCategoryConditionConfirmed: "on",
};

test("referral requires a declared sharing basis and both accountability confirmations", () => {
  assert.equal(referralSchema.safeParse(validReferral).success, true);
  assert.equal(referralSchema.safeParse({ ...validReferral, dataSharingBasis: "" }).success, false);
  assert.equal(referralSchema.safeParse({ ...validReferral, dataSharingConfirmed: "" }).success, false);
  assert.equal(referralSchema.safeParse({ ...validReferral, specialCategoryConditionConfirmed: "" }).success, false);
});

test("referral rejects unsupported sharing basis values", () => {
  const result = referralSchema.safeParse({ ...validReferral, dataSharingBasis: "WHATEVER" });
  assert.equal(result.success, false);
});

test("referral makes clear that the referrer may rely on a basis other than consent", () => {
  for (const dataSharingBasis of ["PUBLIC_TASK", "LEGAL_OBLIGATION", "LEGITIMATE_INTERESTS", "VITAL_INTERESTS"]) {
    assert.equal(referralSchema.safeParse({ ...validReferral, dataSharingBasis }).success, true);
  }
});
