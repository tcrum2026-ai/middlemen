# Pricing

Why the plans are what they are, what they cost to serve, and what to re-check
before changing them. Researched September 2026; re-researched and repriced
again later that month.

## What the market charges

| What | Price | Note |
| --- | --- | --- |
| Human answering service (typical SMB) | $135–$400/mo | $1–$11 per call, or $0.75–$1.50 per minute |
| Smith.ai | $95–$300+/mo entry, metered | $9.75 per call over on lower tiers |
| Ruby Receptionists | $235/mo for 50 minutes | bills per minute, so long calls hurt |
| Abby Connect | $99–$329/mo entry (AI or hybrid) | built on top of a live-receptionist business |
| Rosie (AI) | $49 / $149 / $299 | 250 / 1,000 / 2,000 minutes |
| Goodcall (AI) | from $79/mo | 100 unique callers, unlimited minutes |
| Slang.ai (AI, restaurants) | ~$399/mo | per location |
| AI receptionists, whole category | $25–$700+/mo | flat, per-minute, per-call, or bucket + overage |
| Intercom Fin | $0.99 per resolution | $49/mo base incl. 50; outcome-priced, not seat-priced |

Two things to take from this. The human and hybrid services we displace cost
**$95–$400 even at low volume**, which is the number a prospect is comparing
against — not the other pure-AI tools, most of which undercut all of them. And
the category has settled on **a bucket plus overage**, because pure flat
pricing loses money on heavy users.

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
| Starter | $59 | 300 conversations, no voice | $7.38 | **87%** | $12.29 | **79%** |
| Pro | $199 | 1,000 conversations + 300 min | $42.63 | **79%** | $71.05 | **64%** |
| Business | $449 | 3,000 conversations + 1,200 min | $145.93 | **67%** | $243.21 | **46%** |

Overage earns its keep too: $0.22/min against $0.100 cost is 54% margin on Pro,
$0.18/min is 44% on Business.

Repriced from the original $49/$149/$399 in September 2026 against researched
category comparables (Smith.ai, Ruby, Abby Connect all start at $95–$330/mo for
voice-inclusive AI or hybrid answering, before per-minute overage) — the
allowances also grew alongside the price, not just the number on the sticker.

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

- **Business on Opus 5 is −4% margin at full use**, and Pro on Opus is a thin
  28%. If you let customers pick Opus, either keep it off the big-allowance
  plans or raise those prices further.
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
