import assert from "node:assert/strict";
import test from "node:test";
import { rentLead, tidyTitle } from "../src/lib/format";

test("all-caps advert titles are calmed but acronyms kept", () => {
  assert.equal(tidyTitle("DSS SUPPORTED ACCOMMODATION IN ERDINGTON"), "DSS Supported Accommodation in Erdington");
  assert.equal(tidyTitle("LARGE HMO ROOM"), "Large HMO Room");
  assert.equal(tidyTitle("Maple House, 4 rooms"), "Maple House, 4 rooms");
});

test("rent lead for the photo overlay", () => {
  assert.equal(rentLead(14000, 14000), "£140");
  assert.match(rentLead(12000, 15000), /£120.£150/);
  assert.equal(rentLead(null, null), "Rent on request");
});
