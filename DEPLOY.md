# Deploying Middlemen

Everything below is "paste a value" work. No code changes are needed to go live.

## 1. Environment

| Variable | Needed for | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Live replies | Without it the assistant runs its scripted fallback and every screen still works. Key from [console.anthropic.com](https://console.anthropic.com) → API keys; add credit under Billing (API usage is prepaid and separate from a Claude subscription). |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, OG tags | e.g. `https://middlemen.app` |
| `MIDDLEMEN_DATA_DIR` | Where SQLite lives | Defaults to `./.data`. Point it at a mounted volume. |
| `MIDDLEMEN_SEED_DEMO` | Set `false` to start empty | Otherwise the demo workspace is seeded on first run. |
| `INBOUND_EMAIL_SECRET` | Inbound email webhook | Optional but recommended; the webhook checks it against `x-inbound-secret`. |

Nothing else belongs in the environment — per-workspace keys (Resend, Twilio, Slack, Stripe) are
entered in the dashboard under **Integrations** and stored per workspace.

## 2. Run it

**Docker**

```bash
docker build -t middlemen .
docker run -p 3000:3000 -v middlemen-data:/data \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e NEXT_PUBLIC_SITE_URL=https://your-domain \
  middlemen
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

- Replace the demo workspace (`MIDDLEMEN_SEED_DEMO=false`, or delete it once you have your own).
- Fill the knowledge base and clear every placeholder — the assistant refuses to quote them, which
  means it will say "I don't know" until you do.
- Run the readiness check in **Playground** and close the gaps it finds.
- Put a real callback number in Settings; queued calls are useless without one.

## 5. Known gaps

- No email verification or password reset yet — both need a mail provider wired to the auth flow.
- Outlook, WhatsApp, QuickBooks, HubSpot, Shopify and Zapier are listed but not implemented.
- SQLite means one writer: fine for a single instance, not for horizontal scaling. Moving to
  Postgres is a `lib/db.ts` change, not an application-wide one.
