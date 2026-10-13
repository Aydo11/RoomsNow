import assert from "node:assert/strict";
import test from "node:test";
import { authHref, safeRedirect } from "../src/lib/auth-navigation";
import { registerSchema } from "../src/lib/validation";

test("room seekers can register with only email, password and consent", () => {
  const result = registerSchema.parse({ accountType: "USER", email: " SAM@example.com ", password: "Unique234pass", terms: "on" });
  assert.equal(result.email, "sam@example.com");
  assert.equal(result.firstName, "");
  assert.equal(result.contactMethod, "MESSAGE");
  assert.equal(registerSchema.safeParse({ ...result, terms: "" }).success, false);
  assert.equal(registerSchema.safeParse({ ...result, password: "password123" }).success, false);
});

test("professional registration still needs a real name", () => {
  for (const accountType of ["PROVIDER", "REFERRER", "SERVICE_PROVIDER"]) {
    const input = { accountType, email: "sam@example.com", password: "Unique234pass", terms: "on" };
    assert.equal(registerSchema.safeParse(input).success, false);
    assert.equal(registerSchema.safeParse({ ...input, firstName: "Sam", lastName: "Smith" }).success, true);
  }
});

test("auth links retain the room or search destination without allowing external redirects", () => {
  const destination = "/search?where=Birmingham&from=2026-11-01#results";
  assert.equal(new URL(authHref("/login?reset=1", destination), "https://roomsnow.co.uk").searchParams.get("next"), destination);
  for (const invalid of ["https://evil.test", "//evil.test", "/\\evil.test", "/path\\evil", "/\nevil.test"]) {
    assert.equal(safeRedirect(invalid, "/dashboard"), "/dashboard");
    assert.equal(authHref("/register", invalid), "/register");
  }
});
