/**
 * Splits streamed text on sentence boundaries, returning the whole sentences
 * and whatever tail is still incomplete.
 *
 * ConversationRelay speaks each message as it arrives, so sending raw model
 * tokens makes the voice stutter word by word, and sending the whole reply at
 * once adds the full generation time to the pause before the caller hears
 * anything. Splitting on sentence boundaries starts speech after the first
 * clause while keeping prosody intact.
 *
 * Its own file, plain JavaScript, so the bridge process and the test suite
 * both import the same code with no build step and no type stripping.
 */
export function splitSentences(buffer) {
  const out = [];
  let rest = buffer;
  const boundary = /([.!?]+["')\]]*\s+|\n+)/;
  for (;;) {
    const match = boundary.exec(rest);
    if (!match) break;
    const end = match.index + match[0].length;
    const sentence = rest.slice(0, end).trim();
    if (sentence) out.push(sentence);
    rest = rest.slice(end);
  }
  return { sentences: out, rest };
}
