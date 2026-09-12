# DealBridge

DealBridge is a middleman marketplace that connects **customers** looking for the
best deal with **businesses** competing to win their work. Customers post a
request with a budget, businesses submit competing offers, and an AI matching
engine ranks every offer on price, business rating, and delivery time — with a
plain-language explanation of why it's ranked that way. When a customer accepts
an offer, DealBridge takes a small commission on the deal.

## Stack

- **Next.js 16** (App Router, React 19, Server Actions) + TypeScript
- **Tailwind CSS 4**
- **Prisma** + SQLite (swap `DATABASE_URL` for Postgres/MySQL in production)
- Custom auth: bcrypt password hashing + JWT session cookies (no third-party auth service)
- **AI matching** (`src/lib/ai.ts`): calls Claude (Anthropic API) when `ANTHROPIC_API_KEY`
  is set; otherwise falls back to a deterministic scorer, so the app works fully
  offline out of the box
- **Stripe** Checkout wiring for real payments, behind `STRIPE_SECRET_KEY` — falls
  back to a one-click "simulate payment" demo flow when no key is configured
- **Vitest** for unit tests

## Getting started

```bash
npm install
cp .env.example .env   # edit values as needed; sane defaults work out of the box
npx prisma migrate dev # creates the SQLite database and applies the schema
npm run db:seed        # seeds demo customers, businesses, requests, and offers
npm run dev
```

Visit http://localhost:3000. Demo accounts (all use password `password123`):

| Role     | Email                          |
| -------- | ------------------------------ |
| Admin    | admin@dealbridge.dev           |
| Customer | customer1@dealbridge.dev       |
| Customer | customer2@dealbridge.dev       |
| Business | brightpaint@dealbridge.dev     |
| Business | handyheroes@dealbridge.dev     |
| Business | pixelforge@dealbridge.dev      |
| Business | webwrights@dealbridge.dev      |
| Business | growthlane@dealbridge.dev      |

## How it works

1. **Customers** post a request (title, category, description, budget).
2. **Businesses** in that category browse open requests and submit an offer
   (price, delivery time, description).
3. When the customer opens the request, DealBridge scores every offer with AI
   (`rankOffers` in `src/lib/ai.ts`) and shows the highest-value offer first,
   with a rationale.
4. The customer accepts an offer, creating a **Deal**. The platform commission
   (`PLATFORM_COMMISSION_PERCENT`, default 8%) is calculated immediately and
   shown to both sides.
5. The customer pays (real Stripe Checkout if configured, otherwise a
   simulated instant payment for demo purposes). The business marks the job
   complete once paid.
6. **Admins** see platform-wide stats: users, requests, offers, gross deal
   volume, and commission revenue, plus every deal.

## Environment variables

See `.env.example`. Only `DATABASE_URL` and `JWT_SECRET` are required to run
the app. `ANTHROPIC_API_KEY` and the `STRIPE_*` keys are optional — the app
degrades gracefully without them.

## Testing

```bash
npm test        # unit tests (commission math, AI fallback scorer)
npm run lint     # ESLint
npm run build    # production build / type-check
```

## Project structure

```
prisma/schema.prisma        Data model: User, BusinessProfile, Request, Offer, Deal
prisma/seed.ts               Demo data seed script
src/lib/auth.ts              Password hashing + JWT session cookies
src/lib/ai.ts                AI offer ranking (Claude + deterministic fallback)
src/lib/commission.ts        Platform commission calculation
src/lib/stripe.ts            Stripe Checkout wrapper
src/lib/actions/*.ts         Server Actions for signup/login, requests, offers, deals
src/app/                     Pages: landing, auth, customer/business/admin dashboards
```
