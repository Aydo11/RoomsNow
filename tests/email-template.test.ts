import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { emailRenderer } from "./helpers/email-renderer";
const templates = emailRenderer();

test("reminders and account emails share the responsive branded marketing layout", () => {
 const url = "https://www.roomsnow.co.uk/verify-email?token=test&next=%2Fsearch";
 const html = templates.renderEmail({ preheader: "Please confirm <your> account", heading: "Confirm your email address", bodyHtml: "<p>Your message.</p>", ctaLabel: "Confirm & continue", ctaUrl: url, note: "Expires in 24 hours." });
 assert.match(html, /background-color:#1666AA/);
 assert.match(html, /class="mk-container"/);
 assert.match(html, /width:100%; max-width:600px/);
 assert.match(html, /@media only screen/);
 assert.match(html, /roomsnow-logo-email.png/);
 assert.match(html, /Please confirm &lt;your&gt; account/);
 assert.match(html, /href="https:\/\/www.roomsnow.co.uk\/verify-email\?token=test&amp;next=%2Fsearch"/);
 assert.match(html, /Confirm &amp; continue/);
 assert.match(html, /v:roundrect/);
 assert.match(html, /Expires in 24 hours\./);
 assert.match(html, /copy this link/);
 assert.doesNotMatch(html, /RESEND_UNSUBSCRIBE_URL/);
});

test("notices without actions render without empty buttons or fallback links", () => {
 const html = templates.renderEmail({ preheader: "Updated", heading: "Password changed", bodyHtml: "Your password was changed.", note: "<a href=\"https://www.roomsnow.co.uk/provider/settings\">Manage settings</a>" });
 assert.doesNotMatch(html, /v:roundrect|copy this link/);
 assert.match(html, /Manage settings<\/a>/);
});

test("marketing and welcome emails retain personalisation and unsubscribe rules", () => {
 const provider = templates.renderProviderMailshotEmail({ kind: "CUSTOM", recipientName: "Example Housing", senderName: "Sam", heading: "Provider update", bodyText: "Check your adverts.", ctaLabel: "View adverts", ctaUrl: "https://www.roomsnow.co.uk/provider/adverts" });
 assert.match(provider, /RESEND_UNSUBSCRIBE_URL/);
 assert.match(provider, /Hi Example Housing/);
 const broadcast = templates.renderSeekerAboutEmail({ mode: "broadcast", appUrl: "https://www.roomsnow.co.uk" });
 assert.match(broadcast, /RESEND_UNSUBSCRIBE_URL/);
 const welcome = templates.renderSeekerAboutEmail({ mode: "welcome", appUrl: "https://www.roomsnow.co.uk", firstName: "Sam" });
 assert.match(welcome, /Hi Sam/);
 assert.doesNotMatch(welcome, /RESEND_UNSUBSCRIBE_URL/);
});


test("only the public email logo receives a cross-origin resource exception", () => {
 const config = readFileSync(new URL("../next.config.mjs", import.meta.url), "utf8");
 assert.ok(config.includes('source: "/brand/roomsnow-logo-email.png", headers: [{ key: "Cross-Origin-Resource-Policy", value: "cross-origin" }]'));
 assert.ok(config.includes('{ key: "Cross-Origin-Resource-Policy", value: "same-origin" }'));
});
