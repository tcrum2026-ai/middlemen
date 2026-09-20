import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stripeSignatureValid, twilioSignatureValid } from "../lib/signatures.ts";

/**
 * These two functions are the whole security boundary on three public URLs
 * that spend money: inbound SMS, inbound calls, and subscription billing.
 * Everything here is a case that, if it ever started passing, would mean a
 * stranger could run up a bill or grant themselves a paid plan.
 */

const TWILIO_TOKEN = "an-auth-token";
const TWILIO_URL = "https://lobby.example/api/webhooks/twilio";

function signTwilio(url: string, params: Record<string, string>, token = TWILIO_TOKEN): string {
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  return createHmac("sha1", token).update(Buffer.from(payload, "utf8")).digest("base64");
}

describe("twilioSignatureValid", () => {
  const params = { From: "+15551234567", Body: "hello", To: "+15557654321" };

  it("accepts a correctly signed request", () => {
    assert.equal(twilioSignatureValid(TWILIO_URL, params, TWILIO_TOKEN, signTwilio(TWILIO_URL, params)), true);
  });

  it("does not care what order the parameters arrive in", () => {
    const reordered = { To: params.To, Body: params.Body, From: params.From };
    assert.equal(twilioSignatureValid(TWILIO_URL, reordered, TWILIO_TOKEN, signTwilio(TWILIO_URL, params)), true);
  });

  it("rejects a tampered parameter", () => {
    const signature = signTwilio(TWILIO_URL, params);
    const tampered = { ...params, Body: "hello there" };
    assert.equal(twilioSignatureValid(TWILIO_URL, tampered, TWILIO_TOKEN, signature), false);
  });

  it("rejects an added parameter", () => {
    const signature = signTwilio(TWILIO_URL, params);
    assert.equal(
      twilioSignatureValid(TWILIO_URL, { ...params, MediaUrl0: "http://evil" }, TWILIO_TOKEN, signature),
      false,
    );
  });

  it("rejects the same body signed for a different URL", () => {
    const signature = signTwilio("https://lobby.example/api/voice/incoming", params);
    assert.equal(twilioSignatureValid(TWILIO_URL, params, TWILIO_TOKEN, signature), false);
  });

  it("rejects another workspace's auth token", () => {
    const signature = signTwilio(TWILIO_URL, params, "someone-elses-token");
    assert.equal(twilioSignatureValid(TWILIO_URL, params, TWILIO_TOKEN, signature), false);
  });

  it("rejects an empty signature or an empty token", () => {
    assert.equal(twilioSignatureValid(TWILIO_URL, params, TWILIO_TOKEN, ""), false);
    assert.equal(twilioSignatureValid(TWILIO_URL, params, "", signTwilio(TWILIO_URL, params)), false);
  });
});

const STRIPE_SECRET = "whsec_test_secret";
const NOW = 1_700_000_000_000;

function signStripe(body: string, atMs = NOW, secret = STRIPE_SECRET): string {
  const t = Math.floor(atMs / 1000);
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
}

describe("stripeSignatureValid", () => {
  const body = JSON.stringify({ type: "invoice.paid", data: { object: { id: "in_1" } } });

  it("accepts a correctly signed, fresh event", () => {
    assert.equal(stripeSignatureValid(body, signStripe(body), STRIPE_SECRET, 300, NOW), true);
  });

  it("rejects a missing header", () => {
    assert.equal(stripeSignatureValid(body, null, STRIPE_SECRET, 300, NOW), false);
  });

  it("rejects a header with no signature in it", () => {
    assert.equal(stripeSignatureValid(body, "t=1700000000", STRIPE_SECRET, 300, NOW), false);
    assert.equal(stripeSignatureValid(body, "nonsense", STRIPE_SECRET, 300, NOW), false);
    assert.equal(stripeSignatureValid(body, "", STRIPE_SECRET, 300, NOW), false);
  });

  it("rejects a body that changed after signing", () => {
    const signature = signStripe(body);
    const tampered = body.replace("in_1", "in_2");
    assert.equal(stripeSignatureValid(tampered, signature, STRIPE_SECRET, 300, NOW), false);
  });

  it("rejects the wrong secret", () => {
    assert.equal(stripeSignatureValid(body, signStripe(body, NOW, "whsec_other"), STRIPE_SECRET, 300, NOW), false);
  });

  it("rejects a replay of a validly signed event from outside the window", () => {
    const old = signStripe(body, NOW - 6 * 60 * 1000);
    assert.equal(stripeSignatureValid(body, old, STRIPE_SECRET, 300, NOW), false);
  });

  it("accepts one that is old but still inside the window", () => {
    const recent = signStripe(body, NOW - 4 * 60 * 1000);
    assert.equal(stripeSignatureValid(body, recent, STRIPE_SECRET, 300, NOW), true);
  });

  it("rejects a timestamp from the future beyond the window", () => {
    const ahead = signStripe(body, NOW + 6 * 60 * 1000);
    assert.equal(stripeSignatureValid(body, ahead, STRIPE_SECRET, 300, NOW), false);
  });

  it("rejects a non-numeric timestamp rather than treating it as fresh", () => {
    const digest = createHmac("sha256", STRIPE_SECRET).update(`nope.${body}`).digest("hex");
    assert.equal(stripeSignatureValid(body, `t=nope,v1=${digest}`, STRIPE_SECRET, 300, NOW), false);
  });

  it("takes the first v1 during a secret rotation, not a smuggled second one", () => {
    const valid = signStripe(body);
    const withExtra = `${valid},v1=${"0".repeat(64)}`;
    assert.equal(stripeSignatureValid(body, withExtra, STRIPE_SECRET, 300, NOW), true);
  });

  it("rejects an empty secret", () => {
    assert.equal(stripeSignatureValid(body, signStripe(body), "", 300, NOW), false);
  });
});
