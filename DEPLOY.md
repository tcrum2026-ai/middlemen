# Deploying Lobby

Everything below is "paste a value" work. No code changes are needed to go live.

## 1. Environment

| Variable | Needed for | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Live replies | Without it the assistant runs its scripted fallback and every screen still works. Key from [console.anthropic.com](https://console.anthropic.com) → API keys; add credit under Billing (API usage is prepaid and separate from a Claude subscription). |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, OG tags | e.g. `https://lobby.app` |
| `LOBBY_DATA_DIR` | Where SQLite lives | Defaults to `./.data`. Point it at a mounted volume. |
| `LOBBY_SEED_DEMO` | Set `false` to start empty | Otherwise the demo workspace is seeded on first run. |
| `NEXT_PUBLIC_LEGAL_ENTITY` | Privacy policy and terms | Your legal name. Until it, the contact address and the jurisdiction are all set, both pages show a visible "not ready to publish" banner. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Legal pages, Enterprise plan | Also what the "Contact sales" button mails. Unset, that plan shows "Start free" rather than offering a conversation nobody can have. |
| `NEXT_PUBLIC_LEGAL_JURISDICTION` | Terms | e.g. `England and Wales`. |
| `RESEND_API_KEY` + `AUTH_FROM_EMAIL` | Password reset **and email verification** | Platform mail, separate from the per-workspace Resend keys entered in the dashboard. Without both, `/forgot` tells the visitor that reset email isn't set up rather than pretending to send, and email verification is switched off entirely — a trial that cannot be confirmed is not held back for failing to confirm. |
| `VOICE_BRIDGE_SECRET` | Answering phone calls | Shared secret between the app and the voice bridge. The bridge will not start without it, and `/api/voice/turn` returns 503 until it is set. |
| `VOICE_BRIDGE_URL` / `VOICE_BRIDGE_PORT` | Answering phone calls | The `wss://` URL Twilio connects to, and the port the bridge listens on. The URL must be publicly reachable and TLS-terminated. |
| `VOICE_APP_URL` | Answering phone calls | Where the bridge reaches the app. `http://127.0.0.1:3000` when both run on the same host. |
| `INBOUND_EMAIL_SECRET` | Inbound email webhook | **Required to turn inbound email on.** The webhook fails closed: unset, it returns 503 and accepts nothing, because otherwise anyone could trigger a paid model call on any workspace. Checked against `x-inbound-secret`. |
| `INBOUND_EMAIL_DOMAIN` | Inbound email webhook | The domain you route mail from, e.g. `inbound.your-domain`. The Install page shows the forwarding address only when this is set. |
| `STRIPE_SECRET_KEY` | **Charging for Lobby** | Your platform Stripe key. Unset, the plan buttons on `/dashboard/billing` are disabled and say so — nobody can subscribe. |
| `STRIPE_WEBHOOK_SECRET` | **Charging for Lobby** | **Required.** `POST /api/billing/webhook` fails closed: unset, it returns 503, because an unverified billing webhook lets a stranger hand themselves a paid plan. Signatures older than 5 minutes are rejected too. |
| `STRIPE_PRICE_STARTER` / `_PRO` / `_BUSINESS` | **Charging for Lobby** | The recurring price ids. A plan with no price id refuses checkout with a readable error rather than a blank page. |

Note the two different Stripe keys. The variables above are *yours* — the platform
account that charges for Lobby. The Stripe key entered per workspace under **Integrations**
is the *customer's*, so their assistant can send their customers a payment link. They are
never the same key.

Nothing else belongs in the environment — per-workspace keys (Resend, Twilio, Slack, Stripe) are
entered in the dashboard under **Integrations** and stored per workspace.

## 2. Run it

**Docker**

```bash
docker build -t lobby .
docker run -p 3000:3000 -v lobby-data:/data \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e NEXT_PUBLIC_SITE_URL=https://your-domain \
  lobby
```

**Node directly**

```bash
npm ci && npm run build && npm run start
```

**Answering calls** needs a second process alongside the app, because Next's App
Router cannot hold a long-lived WebSocket:

```bash
npm run voice        # the ConversationRelay bridge, default port 8080
```

Both processes need `VOICE_BRIDGE_SECRET`. Put TLS in front of the bridge — Twilio
will only connect to `wss://`.

A platform with a persistent disk (Fly, Railway, Render, a VPS) suits this better than a
serverless host, because the database is a file. `GET /api/health` reports database
reachability and whether the assistant has credentials — point your platform's health check
at it.

## 3. Connect the outside world

All of this is done in the dashboard, per workspace:

| What | Where | What you paste |
| --- | --- | --- |
| Website widget | Install | One `<script>` tag on your site |
| Calendar | Integrations | Subscribe to the `.ics` URL in Google/Apple/Outlook |
| Email sending | Integrations → Resend | API key + a from-address on a verified domain |
| Inbound email | Your mail provider | Forward/route to `POST /api/webhooks/email`, addressed to `<workspace-slug>@…` |
| SMS | Integrations → Twilio | Account SID, auth token, your number |
| Inbound SMS | Twilio console | Set the number's webhook to `POST /api/webhooks/twilio` — requests are signature-verified |
| Phone calls | Twilio console | Set the number's **Voice** webhook to `POST /api/voice/incoming`, then switch on "Answer incoming calls with AI" in Settings. Signature-verified against that workspace's own auth token; with voice off, calls ring your handoff number instead |
| Team alerts | Integrations → Slack | An incoming webhook URL |
| Payment links | Integrations → Stripe | The workspace's own secret key, for charging *their* customers |

## 3b. Taking payment for Lobby itself

1. In your own Stripe dashboard, create one **recurring** product per plan — Starter $49/mo,
   Pro $149/mo, Business $399/mo — and copy each price id into `STRIPE_PRICE_*`.
2. Add an endpoint under Developers → Webhooks pointing at `https://your-domain/api/billing/webhook`,
   subscribed to `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid` and
   `invoice.payment_failed`. Paste its signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Buy one plan yourself with a real card and confirm `/dashboard/billing` flips from trial to
   active. If it does not, the webhook is the thing to look at — checkout succeeding tells you
   nothing about whether the confirmation reached you.

Every new workspace starts on a 14-day trial with a reduced allowance and no card. When a
trial ends or an allowance runs out the assistant stops replying and hands the thread to a
person — the message is still captured, never dropped. That behaviour is in `lib/entitlement.ts`
and it is what `/terms` promises.

## 4. Before real customers see it

- Set the three `NEXT_PUBLIC_LEGAL_*` variables, then read `/privacy` and `/terms` yourself. They
  are written from what the software actually does, but they are a draft, not legal advice — have
  a lawyer read them before anyone relies on them.
- Replace the demo workspace (`LOBBY_SEED_DEMO=false`, or delete it once you have your own).
- Fill the knowledge base and clear every placeholder — the assistant refuses to quote them, which
  means it will say "I don't know" until you do.
- Run the readiness check in **Playground** and close the gaps it finds.
- Put a real callback number in Settings; queued calls are useless without one.

## 5. Rate limits and abuse

Every endpoint a stranger can reach is counted in-process (`lib/rate-limit.ts`), because each
chat message costs money at the model:

| Endpoint | Limit |
| --- | --- |
| `POST /api/chat`, `/api/chat/stream` | 15/min per address, 240/hour per workspace |
| Sign in | 10 per 15 min, counted per address *and* per account |
| Sign up, workspace creation | 5/hour per address |
| Playground, in-dashboard AI reply | 40/min per workspace |
| Export | 10/hour per workspace |
| Inbound email | 20/hour per sending address |
| Answered calls | 5/hour per caller, 60/hour per workspace, 60 turns per call |

Exhausted quotas return `429` with `Retry-After`, and both chat clients say how long to wait
rather than claiming the connection failed.

Two things to know: the counters live in the process, so **behind more than one instance each
replica counts its own share** — put a limiter at the edge if you scale out. And the per-address
key comes from `x-forwarded-for`, which is forgeable, which is why the per-workspace ceilings
exist alongside it.

Responses also carry `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, a partial
CSP (`base-uri`, `object-src`, `form-action`) and `Strict-Transport-Security`. Framing is denied
everywhere except `/chat/:key`, which is meant to be embeddable. HSTS only applies over HTTPS —
drop it from `next.config.ts` if you serve this on a domain you also need over plain HTTP.

## 6. Known gaps

- Email verification only exists where platform mail does. With `RESEND_API_KEY` and
  `AUTH_FROM_EMAIL` set, sign-up mails a link, an unconfirmed **trial** does not answer
  customers (their messages are captured and queued, never dropped), and the dashboard carries a
  banner with a resend button. Without those two variables there is no link to send, so nothing
  asks for one and anyone can sign up with any address. If you are taking real sign-ups, set them.
- **Voice overage is measured but not charged.** Answered-call minutes are metered accurately and
  the billing page shows what the overage is worth, but nothing reports that usage to Stripe, so
  no invoice picks it up. Bill it yourself, or drop the per-minute line from the plans until it is
  wired. Doing it properly means a metered price per plan in Stripe, storing the subscription item
  id on the workspace alongside `stripe_subscription_id`, and posting a usage record when
  `setCallDuration` runs.
- Outlook, WhatsApp, QuickBooks, HubSpot, Shopify and Zapier are listed but not implemented.
- SQLite means one writer: fine for a single instance, not for horizontal scaling. Moving to
  Postgres is a `lib/db.ts` change, not an application-wide one.
