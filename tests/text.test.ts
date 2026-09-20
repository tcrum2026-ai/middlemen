import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatPhone, lastWholeSentence, xmlEscape } from "../lib/text.ts";
import { splitSentences } from "../server/sentences.mjs";

describe("lastWholeSentence", () => {
  it("keeps everything up to the last full stop", () => {
    assert.equal(
      lastWholeSentence("A diagnostic visit is $89. Drain cleaning starts at $1"),
      "A diagnostic visit is $89.",
    );
  });

  it("counts question marks and exclamation marks as endings", () => {
    assert.equal(lastWholeSentence("Sure! What day suits you? I'd also like to kn"), "Sure! What day suits you?");
  });

  it("returns null when nothing is finished", () => {
    assert.equal(lastWholeSentence("I'm just checking the calendar for you and"), null);
    assert.equal(lastWholeSentence(""), null);
  });

  it("handles a reply that is exactly one complete sentence", () => {
    assert.equal(lastWholeSentence("Done."), "Done.");
  });
});

describe("xmlEscape", () => {
  it("escapes everything that could break out of a TwiML attribute", () => {
    assert.equal(xmlEscape(`<a href="x">&'`), "&lt;a href=&quot;x&quot;&gt;&amp;&apos;");
  });

  it("escapes the ampersand first, so escapes are not double-escaped", () => {
    assert.equal(xmlEscape("&lt;"), "&amp;lt;");
  });

  it("leaves ordinary text alone", () => {
    assert.equal(xmlEscape("+15551234567"), "+15551234567");
  });
});

describe("formatPhone", () => {
  it("renders E.164 the way a person reads it", () => {
    assert.equal(formatPhone("+15551234567"), "(555) 123-4567");
  });

  it("handles a ten-digit number with no country code", () => {
    assert.equal(formatPhone("5551234567"), "(555) 123-4567");
  });

  it("leaves anything it cannot parse exactly as it found it", () => {
    // A wrong guess at grouping is worse than no grouping.
    assert.equal(formatPhone("+442071234567"), "+442071234567");
    assert.equal(formatPhone("withheld"), "withheld");
    assert.equal(formatPhone("  +33 1 23 45 67 89  "), "+33 1 23 45 67 89");
  });
});

describe("splitSentences", () => {
  it("emits whole sentences and keeps the unfinished tail back", () => {
    const { sentences, rest } = splitSentences("That's $89. Want me to book it? I have Thurs");
    assert.deepEqual(sentences, ["That's $89.", "Want me to book it?"]);
    assert.equal(rest, "I have Thurs");
  });

  it("emits nothing when no sentence has ended", () => {
    const { sentences, rest } = splitSentences("Let me check that for");
    assert.deepEqual(sentences, []);
    assert.equal(rest, "Let me check that for");
  });

  it("does not split on a decimal point mid-number", () => {
    // "$1,400.00 installed" must stay one utterance, or the voice pauses
    // inside the price.
    const { sentences, rest } = splitSentences("It's $1,400.00 installed");
    assert.deepEqual(sentences, []);
    assert.equal(rest, "It's $1,400.00 installed");
  });

  it("treats a newline as a boundary", () => {
    const { sentences } = splitSentences("Line one\nLine two\n");
    assert.deepEqual(sentences, ["Line one", "Line two"]);
  });
});
