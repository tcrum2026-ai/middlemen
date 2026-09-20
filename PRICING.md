# Pricing

Why the plans are what they are, what they cost to serve, and what to re-check
before changing them. Researched September 2026.

## What the market charges

| What | Price | Note |
| --- | --- | --- |
| Human answering service (typical SMB) | $135–$400/mo | $1–$11 per call, or $0.75–$1.50 per minute |
| Smith.ai | $292.50/mo for 30 calls | $9.75 per call over |
| Ruby Receptionists | $235/mo for 50 minutes | bills per minute, so long calls hurt |
| Rosie (AI) | $49 / $149 / $299 | 250 / 1,000 / 2,000 minutes |
| Goodcall (AI) | from $79/mo | 100 unique callers, unlimited minutes |
| Slang.ai (AI, restaurants) | ~$399/mo | per location |
| AI receptionists, whole category | $29–$500+/mo | flat, per-minute, per-call, or bucket + overage |
| Intercom Fin | $0.99 per resolution | $49/mo base incl. 50; outcome-priced, not seat-priced |

Two things to take from this. The human services we displace cost **$235–$400
for very little volume**, which is the number a prospect is comparing against —
not the other AI tools. And the category has settled on **a bucket plus
overage**, because pure flat pricing loses money on heavy users.

## What it costs us to serve

Measured, not guessed. The cached prefix (system prompt + 7 tool schemas) is
**2,148 tokens**, and prompt caching is on, so it bills at ~10% after the first
call in a conversation. Twilio ConversationRelay is **$0.07/min** plus ~$0.0085/min
for the inbound PSTN leg.

| Model | Written conversation | 3-minute call (all-in) | Per voice minute |
| --- | --- | --- | --- |
| Opus 5 | $0.102 | $0.398 | $0.133 |
| Sonnet 5 | $0.041 | $0.301 | $0.100 |
| Haiku 4.5 | $0.020 | $0.268 | $0.089 |

Two consequences drive the whole design:

1. **A call costs ~3x a written conversation**, and most of that gap is Twilio,
   not the model. Averaging both into one "conversation" allowance is how you
   lose money on the customers who actually use the phone. So voice is metered
   separately.
2. **Model choice is the biggest lever we control.** Sonnet 5 costs 40% of Opus 5
   per conversation and answers a front-desk question from a knowledge base just
   as well. It is the default; Opus is a per-workspace setting for anyone who
   wants it and has priced for it.

## The plans, and what they earn

Assuming Sonnet 5, and that a customer uses 60% of their allowance (the normal
case) or 100% (the worst case):

| Plan | Price | Included | COGS @60% | Margin | COGS @100% | Margin |
| --- | --- | --- | --- | --- | --- | --- |
| Starter | $49 | 300 conversations, no voice | $7.38 | **85%** | $12.29 | **75%** |
| Pro | $149 | 1,000 conversations + 250 min | $39.62 | **73%** | $66.04 | **56%** |
| Business | $399 | 3,000 conversations + 1,000 min | $133.90 | **66%** | $223.17 | **44%** |

Overage earns its keep too: $0.25/min against $0.100 cost is 60% margin on Pro,
$0.20/min is 50% on Business.

## What this replaced, and why

The launch pricing was **Solo $49 / Team $149 for 2,500 conversations / Scale
quote-only**, with Opus 5 on every workspace. At those numbers the Team plan
loses money:

- 2,500 conversations × $0.102 = **$256 of COGS on $149 of revenue — −72% margin**
- Even at 60% usage it is −3%: the plan never makes money, it only loses less

The 2,500 figure was also unrealistic — a small business gets hundreds of
inbound messages a month, not thousands — so it was simultaneously
unprofitable *and* not a selling point anyone could use.

## Before you change anything

- **Business on Opus 5 is −10% margin at full use.** If you let customers pick
  Opus, either keep it off the big-allowance plans or raise those prices.
- **Re-measure after any prompt change.** The 2,148-token prefix is the cached
  floor under every call; adding tools or lengthening the system prompt raises
  the cost of every conversation on every plan.
- **Watch the ratio, not the bill.** The number that matters is COGS as a share
  of revenue per workspace. `/dashboard/billing` shows usage per workspace;
  Anthropic's console shows spend.
- These are list prices with no discounting modelled. Annual billing at ten
  months for twelve (already on the pricing page) takes ~17% off the top.

Every table above comes out of `scripts/pricing-model.mjs` — run `node
scripts/pricing-model.mjs` to re-run it after changing a price, an allowance or
the prompt.
