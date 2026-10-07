import assert from "node:assert/strict";
import test from "node:test";
import { contactProgress } from "../src/lib/contact-activity";

const at = (minute: number) => new Date(Date.UTC(2026, 8, 30, 9, minute));

test("a person contacting a provider is awaiting a reply until provider staff write", () => {
  const staff = new Set(["staff"]);
  const opened = contactProgress([{ senderId: "person", firstAt: at(0), messageCount: 2 }], staff);
  assert.equal(opened.label, "Awaiting provider");
  assert.equal(opened.firstSenderId, "person");
  const replied = contactProgress([
    { senderId: "person", firstAt: at(0), messageCount: 3 },
    { senderId: "staff", firstAt: at(5), messageCount: 1 },
  ], staff);
  assert.equal(replied.label, "Provider replied");
  assert.equal(replied.messageCount, 4);
});

test("provider-initiated contact shows whether the person replied", () => {
  const progress = contactProgress([
    { senderId: "staff", firstAt: at(0), messageCount: 1 },
    { senderId: "person", firstAt: at(2), messageCount: 1 },
  ], new Set(["staff"]));
  assert.equal(progress.providerStarted, true);
  assert.equal(progress.label, "Person replied");
});
