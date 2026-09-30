import test from "node:test";
import assert from "node:assert/strict";
import { scrubText } from "../src/lib/sentry-options";

test("sentry: error text keeps the useful part and drops personal details", () => {
  assert.equal(scrubText("Cannot read properties of undefined (reading 'id')"), "Cannot read properties of undefined (reading 'id')");
  assert.equal(scrubText("Bad value jane.doe+x@example.co.uk sent"), "Bad value [email] sent");
  assert.equal(scrubText("Call 07700 900123 now"), "Call [number] now");
  assert.equal(scrubText("Loading chunk 8123 failed."), "Loading chunk 8123 failed.");
});
