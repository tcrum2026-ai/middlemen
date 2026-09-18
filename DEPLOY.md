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
| `INBOUND_EMAIL_SECRET` | Inbound email webhook | **Required to turn inbound email on.** The webhook fails closed: unset, it returns 503 and accepts nothing, because otherwise anyone could trigger a paid model call on any workspace. Checked against `x-inbound-secret`. |
| `INBOUND_EMAIL_DOMAIN` | Inbound email webhook | The domain you route mail from, e.g. `inbound.your-domain`. The Install page shows the forwarding address only when this is set. |

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
| Team alerts | Integrations → Slack | An incoming webhook URL |
| Payment links | Integrations → Stripe | Secret key |

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

- No email verification or password reset yet — both need a mail provider wired to the auth flow.
- Outlook, WhatsApp, QuickBooks, HubSpot, Shopify and Zapier are listed but not implemented.
- SQLite means one writer: fine for a single instance, not for horizontal scaling. Moving to
  Postgres is a `lib/db.ts` change, not an application-wide one.
