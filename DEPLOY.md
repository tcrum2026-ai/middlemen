# Deploying Lobby

Everything below is "paste a value" work. No code changes are needed to go live.

## 1. Environment

| Variable | Needed for | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Live replies | Without it the assistant runs its scripted fallback and every screen still works. Key from [console.anthropic.com](https://console.anthropic.com) → API keys; add credit under Billing (API usage is prepaid and separate from a Claude subscription). |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, OG tags | e.g. `https://lobby.app` |
| `LOBBY_DATA_DIR` | Where SQLite lives | Defaults to `./.data`. Point it at a mounted volume. |
| `LOBBY_DATA_PERSISTENT` | What `/api/health` reports for `storage` | Set to `true` only once `LOBBY_DATA_DIR` is a real mounted volume. `LOBBY_DATA_DIR` being set is not proof of that by itself — this image sets it unconditionally, so a deploy with no disk attached would otherwise be misreported as persistent. |
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
| `LOBBY_SCHEDULER` | Turning the built-in ticker off | The app sends due follow-ups itself every five minutes. Set to `off` only if you would rather drive that from outside. |
| `CRON_SECRET` | `POST /api/cron/tick` | **Required by that endpoint**, which fails closed without it. It sends real email and SMS on a customer's behalf, so an open URL is a way for a stranger to spend their money and their sending reputation. |
| `RESEND_API_BASE` | A mail relay | Only if you post mail somewhere other than Resend. Leave unset otherwise. |
| `TWILIO_API_BASE` | Testing | Points every Twilio call — sends and the connect-time checks — at a stand-in server. Leave unset in any real deployment. |
| `STRIPE_SECRET_KEY` | **Charging for Lobby** | Your platform Stripe key. Unset, the plan buttons on `/dashboard/billing` are disabled and say so — nobody can subscribe. |
| `STRIPE_WEBHOOK_SECRET` | **Charging for Lobby** | **Required.** `POST /api/billing/webhook` fails closed: unset, it returns 503, because an unverified billing webhook lets a stranger hand themselves a paid plan. Signatures older than 5 minutes are rejected too. |
| `STRIPE_PRICE_STARTER` / `_PRO` / `_BUSINESS` | **Charging for Lobby** | The recurring price ids. A plan with no price id refuses checkout with a readable error rather than a blank page. |
| `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET` | One-click Google Calendar | A single OAuth client for every workspace's "Connect Google Calendar" button — not a per-workspace credential. Unset, that button is replaced with a note explaining what to set, and the paste-a-secret-URL calendar (Integrations → Your calendar) still works without it. |

Note the two different Stripe keys. The variables above are *yours* — the platform
account that charges for Lobby. The Stripe key entered per workspace under **Integrations**
is the *customer's*, so their assistant can send their customers a payment link. They are
never the same key.

**Follow-ups send themselves.** Your automation rules schedule them; the app runs a pass every
five minutes and sends the ones that have fallen due, on the channel they were written for,
using the workspace's own Resend or Twilio credentials. One that is more than 48 hours overdue
is dropped rather than sent — "your appointment is tomorrow" arriving three days afterwards is
worse than nothing. Set `LOBBY_SCHEDULER=off` and POST `/api/cron/tick` if you would rather own
the schedule.

**Knowing something needs you.** When the assistant escalates — a refund, a question it
cannot answer, a caller who wanted a person, a stopped subscription — it posts to Slack if
that workspace has connected it, *and* emails the workspace owner. The email is throttled to
one per workspace per half hour and mentions how many other things arrived behind it, so a
busy Saturday is one message rather than forty. It goes only to an owner whose address has
been confirmed. With no Slack and no platform mail, nothing tells anyone and the queue has to
be checked by hand.

Nothing else belongs in the environment — per-workspace keys (Resend, Twilio, Slack, Stripe) are
entered in the dashboard under **Integrations** and stored per workspace.

## 2. Run it

### The short version

| Where | Data survives? | Costs | Use it for |
| --- | --- | --- | --- |
| **Fly.io** with a volume | yes | a few $/month | real customers |
| **Render** Starter + disk | yes | a few $/month | real customers |
| **Render** free plan | **no** — wiped on restart, sleeps when idle | nothing | showing someone |
| **Netlify / Vercel** | **no** — wiped whenever a container recycles | nothing | showing someone |
| **Docker anywhere** with a mounted volume | yes | your host | real customers |

The split is always the same thing: this app keeps its data in a SQLite file, so it needs
somewhere to put that file that outlives the process. A host without a disk can run the demo
and nothing more. `GET /api/health` reports `"storage": "persistent"` or
`"temporary (resets on restart)"` so you never have to guess which you got.

`npm run image` builds the app, lays out exactly what the Dockerfile copies, boots it, and
checks it serves, signs in, renders every page and writes to its data directory. Run it before
you deploy.

### Fly.io

`fly.toml` is in the repo. The volume is the part that matters — without it the data goes.

```bash
fly launch --no-deploy          # accept the existing fly.toml
fly volumes create lobby_data --size 1 --region lhr
fly secrets set LOBBY_DEMO_PASSWORD=pick-something   # demo only; skip for real use
fly deploy
```

One machine, deliberately: SQLite has a single writer. Scaling out means moving `lib/db.ts` to
Postgres first, not raising the machine count.

### Render

`render.yaml` is in the repo, and ships on the **free** plan.

1. **New → Blueprint**, pick this repository.
2. Pick the branch the code is on. The blueprint names it too, but Render reads `render.yaml`
   from whichever branch you select here, so it has to be the right one.
3. Render prompts for the variables marked `sync: false`. Set `LOBBY_DEMO_PASSWORD` to whatever
   you like — that turns on the shared demo login. Leave the rest blank; every one of them is a
   paid service, and the app says so on the page rather than failing quietly.
4. Apply, and wait for the first build. Docker builds of this take a few minutes.
5. Once it is live, set `NEXT_PUBLIC_SITE_URL` to `https://<name>.onrender.com` and redeploy.
   Skipping this only affects canonical links, the sitemap and OG tags.

Then open `/api/health` and check `"storage"`. On the free plan it says
`temporary (resets on restart)` — correct, and the dashboard carries a banner saying so. Free
instances also sleep after 15 minutes idle and take about a minute to wake, so the first
request after a pause is slow and the demo data is fresh again.

For real use: uncomment the `disk:` block and change `plan: free` to `plan: starter`. That
costs a few dollars a month, and it is the only version to point a customer at.

### Docker, anywhere

```bash
docker build -t lobby .
docker run -d -p 3000:3000 -v lobby-data:/data \
  -e NEXT_PUBLIC_SITE_URL=https://your-domain \
  -e LOBBY_DATA_PERSISTENT=true \
  lobby
```

The image sets `LOBBY_DATA_DIR=/data`, so `-v lobby-data:/data` is what keeps your data. Leave
it out and the container writes to a directory it throws away when it stops. `LOBBY_DATA_PERSISTENT=true`
is what `/api/health` actually trusts to say `storage: persistent` — set it only alongside a real
`-v`, since the image sets `LOBBY_DATA_DIR` either way.



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
| Calendar (out) | Integrations | Subscribe to the `.ics` URL in Google/Apple/Outlook so Lobby's bookings appear there — not needed at all once Google Calendar is connected below, since bookings are then written there directly |
| Calendar, Google (two-way) | Integrations → Google Calendar | Click "Connect Google Calendar" and approve access. Needs `GOOGLE_OAUTH_CLIENT_ID`/`_SECRET` set on the deployment — see § 3c |
| Calendar, other (in only) | Integrations → Your calendar | For anything that isn't Google, or if you'd rather not use OAuth: paste your calendar's **secret iCal address**, so Lobby never offers a time you are already busy. One-way — bookings still need the feed above to show up there |
| Email sending | Integrations → Resend | API key + a from-address on a verified domain |
| Inbound email | Your mail provider | Forward/route to `POST /api/webhooks/email`, addressed to `<workspace-slug>@…` |
| SMS | Integrations → Twilio | Account SID, auth token, your number. Lobby checks them with Twilio before saving, finds the number on the account, and stores it in the exact form inbound messages are matched against |
| Inbound SMS | Automatic | On connect, the number's messaging webhook is pointed at `POST /api/webhooks/twilio` — but only if it's unset or still Twilio's demo URL. A webhook already pointing somewhere else is left alone and the page says so, with the address to set by hand. Needs `NEXT_PUBLIC_SITE_URL` (or a public https host) so Twilio can reach it. Requests are signature-verified |
| Phone calls | Automatic, then Settings | The voice webhook is pointed at `POST /api/voice/incoming` on connect under the same rule — never overwriting a line that already goes somewhere. Switch on "Answer incoming calls with AI" in Settings; until then, calls ring your handoff number. Signature-verified against that workspace's own auth token |
| Team alerts | Integrations → Slack | An incoming webhook URL |
| Payment links | Integrations → Stripe | The workspace's own secret key, for charging *their* customers |

## 3b. Taking payment for Lobby itself

1. In your own Stripe dashboard, create one **recurring** product per plan — Starter $59/mo,
   Pro $199/mo, Business $449/mo — and copy each price id into `STRIPE_PRICE_*`. (Current prices
   live in `lib/marketing.ts`'s `PLANS`; check there first in case they've since changed.)
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

## 3c. Google Calendar, the one-click way

Setting this up is free — it's a Google Cloud OAuth client, not a paid API.

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or reuse) a project, then
   enable the **Google Calendar API** under APIs & Services → Library.
2. Under APIs & Services → OAuth consent screen, add the scopes this app requests
   (`.../auth/calendar`, `openid`, `email`) and, while the app is in "Testing" status, add every
   Google account that should be able to connect as a test user — otherwise Google shows an
   "unverified app" warning to anyone who isn't listed.
3. Under Credentials → Create Credentials → OAuth client ID → Web application, add an authorized
   redirect URI of `https://your-domain/api/integrations/google-calendar/callback` (and, for local
   testing, `http://localhost:3000/api/integrations/google-calendar/callback`).
4. Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` to that client's id and secret.
5. In a workspace's Integrations page, click **Connect Google Calendar** and approve access. From
   then on, that workspace's real availability blocks bookings, and every booking Lobby makes is
   written straight onto the connected calendar — no separate feed to subscribe to.

Disconnecting revokes the grant with Google, not just this app's copy of the token. If a refresh
ever fails — the owner revoked access from their Google account, for instance — the workspace is
treated as disconnected rather than left silently broken.

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

## 5b. A public demo

Set `LOBBY_DEMO_PASSWORD` and the seeded workspace gets a shared owner, so anyone with the link can
drive every feature instead of browsing a read-only copy. `LOBBY_DEMO_EMAIL` names the account
(default `demo@lobby.app`). The dashboard carries a banner saying the data resets and nothing can
spend money, and `GET /api/health` lists every paid service with whether it is switched on — so the
claim is checkable rather than promised.

Leave the variable unset in any real deployment. Without it none of this exists.

A serverless host (Netlify, Vercel) can run the demo but not the product: there is no persistent
disk, so the database falls back to the OS temp directory and is wiped whenever a container recycles,
and `LOBBY_SCHEDULER=off` is required because a frozen container never fires an interval. `netlify.toml`
in the repo is configured for exactly that, and says so. For anything real, use the Dockerfile on a
host with a mounted volume.

## 6. Known gaps

- Email verification only exists where platform mail does. With `RESEND_API_KEY` and
  `AUTH_FROM_EMAIL` set, sign-up mails a link, an unconfirmed **trial** does not answer
  customers (their messages are captured and queued, never dropped), and the dashboard carries a
  banner with a resend button. Without those two variables there is no link to send, so nothing
  asks for one and anyone can sign up with any address. If you are taking real sign-ups, set them.
- **Voice overage is billed automatically once a Stripe meter is configured.** Set
  `STRIPE_VOICE_METER_EVENT` to the event name of a Billing Meter you create in the Stripe
  dashboard, and attach a metered price using that meter to each paid plan's subscription. When a
  call ends, `app/api/voice/turn/route.ts` reports only the minutes that call newly pushed past the
  workspace's allowance (never the whole call, so a workspace already deep in overage isn't rebilled
  for the same minutes every time another call ends) via `POST /v1/billing/meter_events`, keyed on
  the conversation id so a retried report is a no-op on Stripe's side. A trial is never billed for
  overage — the billing page still shows minutes-over for a trial, but that count is a display
  figure, not what gets reported. Without `STRIPE_VOICE_METER_EVENT` set, the billing page falls
  back to its old "add it to their invoice yourself" copy and nothing is reported to Stripe.
- **Google Calendar's one-click connect needs `GOOGLE_OAUTH_CLIENT_ID`/`_SECRET` set** (§ 3c);
  without them the button on Integrations is replaced with a note saying so, and the paste-a-secret-URL
  calendar still works either way. It also only ever writes to the connected account's **primary**
  calendar — there is no picker for a secondary one.
- Outlook, WhatsApp, QuickBooks, HubSpot, Shopify and Zapier are listed but not implemented.
- SQLite means one writer: fine for a single instance, not for horizontal scaling. Every query in
  this codebase calls `better-sqlite3` synchronously (`.prepare().get()/.run()/.all()`, no
  `await`), so moving to any real network database — Postgres included — is not a `lib/db.ts`-only
  change: a network round trip is inherently async, and that ripples into every file that queries
  the database, not just the one that opens the connection.
