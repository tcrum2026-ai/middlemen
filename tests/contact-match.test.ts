import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchesContact, phoneKey } from "../lib/contact-match.ts";

const dana = { name: "Dana Whitfield", email: "dana.whitfield@example.com", phone: "+1 555 010 2030" };

describe("matchesContact", () => {
  it("matches an email regardless of case or padding", () => {
    assert.equal(matchesContact(dana, { email: "  DANA.Whitfield@Example.com " }), true);
  });

  it("matches a phone number however it is punctuated", () => {
    for (const given of ["(555) 010-2030", "555-010-2030", "+15550102030", "5550102030"]) {
      assert.equal(matchesContact(dana, { phone: given }), true, given);
    }
  });

  it("matches an exact name as a last resort", () => {
    assert.equal(matchesContact(dana, { name: "dana whitfield" }), true);
  });

  it("does not match a different person", () => {
    assert.equal(matchesContact(dana, { email: "dave@example.com" }), false);
    assert.equal(matchesContact(dana, { phone: "+1 555 999 0000" }), false);
    assert.equal(matchesContact(dana, { name: "Dana Whitfield-Jones" }), false);
  });

  it("never matches on nothing", () => {
    // An empty claim must not rearrange the first person in the table.
    assert.equal(matchesContact(dana, {}), false);
    assert.equal(matchesContact(dana, { email: "", phone: "", name: "" }), false);
    assert.equal(matchesContact(dana, { email: null, phone: null, name: null }), false);
  });

  it("does not match a contact that has no such detail recorded", () => {
    const sparse = { name: "Unknown caller", email: null, phone: null };
    assert.equal(matchesContact(sparse, { email: "dana@example.com" }), false);
    assert.equal(matchesContact(sparse, { phone: "5550102030" }), false);
  });

  it("ignores a phone number too short to identify anyone", () => {
    // "call 101" must not match every contact whose number ends in 101.
    assert.equal(phoneKey("101"), "");
    assert.equal(matchesContact({ name: "X", email: null, phone: "101" }, { phone: "101" }), false);
  });

  it("matches international and national forms of the same number", () => {
    assert.equal(phoneKey("+44 7700 900123"), phoneKey("07700 900123"));
  });
});
