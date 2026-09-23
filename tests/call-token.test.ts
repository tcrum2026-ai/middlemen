import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { callTokenValid, issueCallToken } from "../server/call-token.mjs";

/**
 * The voice relay is public — Twilio has to reach it — so this token is the
 * only thing stopping a stranger from opening a socket, claiming any
 * workspace, and running phone-call model turns on its bill. Every case here
 * that started passing would be that hole reopening.
 */

const SECRET = "relay-secret";
const NOW = 1_800_000_000_000;

describe("voice relay call tokens", () => {
  const token = issueCallToken(SECRET, "biz_a", "CA123", NOW);

  it("accepts the token minted for this call", () => {
    assert.equal(callTokenValid(SECRET, "biz_a", "CA123", token, NOW + 5_000), true);
  });

  it("refuses it for a different workspace", () => {
    assert.equal(callTokenValid(SECRET, "biz_b", "CA123", token, NOW), false);
  });

  it("refuses it for a different call", () => {
    assert.equal(callTokenValid(SECRET, "biz_a", "CA999", token, NOW), false);
  });

  it("refuses it once expired", () => {
    assert.equal(callTokenValid(SECRET, "biz_a", "CA123", token, NOW + 2 * 60_000 + 1), false);
  });

  it("refuses one signed with another secret", () => {
    assert.equal(callTokenValid("other-secret", "biz_a", "CA123", token, NOW), false);
  });

  it("refuses a pushed-out expiry, which would change the signature", () => {
    const [, sig] = token.split(".");
    assert.equal(callTokenValid(SECRET, "biz_a", "CA123", `${NOW + 60_000}.${sig}`, NOW), false);
  });

  it("refuses an expiry further out than the lifetime allows, even if signed", () => {
    const farFuture = issueCallToken(SECRET, "biz_a", "CA123", NOW + 60 * 60_000);
    assert.equal(callTokenValid(SECRET, "biz_a", "CA123", farFuture, NOW), false);
  });

  it("refuses missing and malformed tokens", () => {
    for (const bad of [undefined, null, "", "nodot", ".sig", "abc.def", 42]) {
      assert.equal(callTokenValid(SECRET, "biz_a", "CA123", bad, NOW), false, String(bad));
    }
  });

  it("refuses everything when no secret is configured", () => {
    assert.equal(callTokenValid("", "biz_a", "CA123", token, NOW), false);
  });
});
