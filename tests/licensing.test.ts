import assert from "node:assert/strict";
import test from "node:test";
import { LICENSING_ITEM_KEYS, LICENSING_STANDARDS, licensingProgress } from "../src/lib/licensing";

test("item keys are unique and prefixed by their standard", () => {
  const all = LICENSING_STANDARDS.flatMap((s) => s.items.map((i) => i.key));
  assert.equal(new Set(all).size, all.length);
  for (const s of LICENSING_STANDARDS) for (const i of s.items) assert.ok(i.key.startsWith(`${s.key}.`), i.key);
});

test("progress counts only known items", () => {
  const empty = licensingProgress(new Set());
  assert.equal(empty.percent, 0);
  const all = licensingProgress(new Set([...LICENSING_ITEM_KEYS, "made.up"]));
  assert.equal(all.done, all.total);
  assert.equal(all.percent, 100);
  const one = licensingProgress(new Set(["staff.dbs"]));
  assert.equal(one.done, 1);
  assert.equal(one.standards.find((s) => s.key === "staff")?.done, 1);
});
