import assert from "node:assert/strict";
import test from "node:test";
import { headerKey, parseCsv, parseUkDate } from "../src/lib/csv-import";

test("parseCsv handles quotes, escaped quotes, CRLF and blank lines", () => {
  const rows = parseCsv('\uFEFFFirst name,Notes\r\n"Sam","Needs a ""quiet"" room,\nground floor"\r\n\r\nAlex,\n');
  assert.deepEqual(rows, [
    ["First name", "Notes"],
    ["Sam", 'Needs a "quiet" room,\nground floor'],
    ["Alex", ""],
  ]);
});

test("headerKey normalises spreadsheet headers", () => {
  assert.equal(headerKey("Date of Birth"), "dateofbirth");
  assert.equal(headerKey(" E-mail "), "email");
});

test("parseUkDate reads UK and ISO dates and rejects impossible ones", () => {
  assert.equal(parseUkDate("14/03/1996")?.toISOString().slice(0, 10), "1996-03-14");
  assert.equal(parseUkDate("1996-03-14")?.toISOString().slice(0, 10), "1996-03-14");
  assert.equal(parseUkDate("31/02/1996"), null);
  assert.equal(parseUkDate("03/14/1996"), null);
  assert.equal(parseUkDate("not a date"), null);
});
