import assert from "node:assert/strict";
import test from "node:test";
import { canLoadMarketingTags, createGoogleCommandQueue, isPublicAnalyticsPage, publicAnalyticsUrl, publicAnalyticsReferrer, publicAnalyticsPageTitle } from "../src/lib/analytics-safety";

test("referrer preserves acquisition domain without transmitting private URL details", () => {
  assert.equal(publicAnalyticsReferrer("https://www.google.com/search?q=private+housing+need#details"), "https://www.google.com");
  assert.equal(publicAnalyticsReferrer("https://user:secret@referrer.example/private?email=person@example.com"), "https://referrer.example");
  for (const referrer of ["", "invalid", "javascript:alert(1)", "file:///private/file"]) {
    assert.equal(publicAnalyticsReferrer(referrer), "");
  }
});

test("notification counts do not split page titles into separate report rows", () => {
  assert.equal(publicAnalyticsPageTitle("(8) Search rooms | RoomsNow"), "Search rooms | RoomsNow");
  assert.equal(publicAnalyticsPageTitle("HMO rooms | RoomsNow"), "HMO rooms | RoomsNow");
});

test("Google command shim produces the supported Arguments queue", () => {
  const queue: unknown[] = [];
  const gtag = createGoogleCommandQueue(queue);
  gtag("js", new Date(0));
  gtag("config", "G-TEST", { send_page_view: false });
  assert.equal(Object.prototype.toString.call(queue[0]), "[object Arguments]");
  assert.deepEqual(Array.from(queue[1] as IArguments), ["config", "G-TEST", { send_page_view: false }]);
});

test("private and email-confirmation pages never initialise tags", () => {
  for (const path of ["/verify-email", "/reset-password/token", "/provider", "/dashboard/requests", "/messages/123", "/api/auth/verify-email", "/register"]) {
    assert.equal(isPublicAnalyticsPage(path), false, path);
    assert.equal(canLoadMarketingTags(path, ""), false, path);
  }
  assert.equal(isPublicAnalyticsPage("/search"), true);
});

test("campaign attribution is allowed but personal searches are excluded", () => {
  assert.equal(canLoadMarketingTags("/search", "where=private+location"), false);
  assert.equal(canLoadMarketingTags("/", "utm_source=tiktok&utm_campaign=roomsnow_7day&ttclid=ABC123"), true);
  const tiktokCampaign = new URLSearchParams({ utm_source: "tiktok", utm_campaign: "RoomsNow | Birmingham Room Search | Traffic Test", utm_id: "1877565436047586", utm_medium: "paid" }).toString();
  assert.equal(canLoadMarketingTags("/", tiktokCampaign), true);
  assert.equal(new URL(publicAnalyticsUrl("https://roomsnow.co.uk", "/", tiktokCampaign)).searchParams.get("utm_campaign"), "RoomsNow | Birmingham Room Search | Traffic Test");
  assert.equal(canLoadMarketingTags("/", "utm_source=person%40example.com"), false);
  assert.equal(canLoadMarketingTags("/search", ""), true);
  assert.equal(publicAnalyticsUrl("https://www.roomsnow.co.uk", "/search", "?where=private&email=a%40b.com&utm_source=facebook"), "https://www.roomsnow.co.uk/search?utm_source=facebook");
});
