# Go live

Work down this list. `DEPLOY.md` explains each variable in detail; this is the order to do
things in, and how to check each one actually took.

## 1. Before the first deploy

- [ ] **Anthropic key with credit.** `ANTHROPIC_API_KEY` from
      [console.anthropic.com](https://console.anthropic.com) → API keys. API usage is prepaid and
      separate from a Claude subscription, so add credit under Billing. Without a key the site
      still works, but every reply comes from the keyword fallback rather than Claude.
- [ ] **Your domain.** Set `NEXT_PUBLIC_SITE_URL` to it, with no trailing slash. Canonical URLs,
      the sitemap, OG tags and password-reset links all read it.
- [ ] **A persistent disk**, with `LOBBY_DATA_DIR` pointing at it. The database is a file; a
      serverless host will lose it on every deploy.
- [ ] **The three legal variables** — `NEXT_PUBLIC_LEGAL_ENTITY`, `NEXT_PUBLIC_CONTACT_EMAIL`,
      `NEXT_PUBLIC_LEGAL_JURISDICTION`. Until all three are set, `/privacy` and `/terms` show a
      visible "not ready to publish" banner.
- [ ] **Read `/privacy` and `/terms` yourself.** They are written from what the software actually
      does, but they are a draft, not legal advice. Have a lawyer read them before anyone relies
      on them.

## 2. Deploy, then check the plumbing

- [ ] `GET /api/health` returns `"status":"ok"` and `"assistant":"live"`. If it says
      `scripted fallback`, the key did not reach the running process.
- [ ] `GET /sitemap.xml` shows your real domain, not `localhost:3000`.
- [ ] Open the site and send the demo assistant a message. It should stream a reply and show the
      steps it took above it.
- [ ] Response headers include `X-Frame-Options: DENY` and `Strict-Transport-Security`.

## 3. Make it yours

- [ ] Create your account and workspace at `/signup`. The trade you pick preloads a starter pack
      you then edit.
- [ ] **Replace every placeholder in Knowledge.** Unedited starter articles are treated as
      missing on purpose — the assistant refuses to quote them, so it will say "I don't know"
      until you write the real thing.
- [ ] Put a real callback number in Settings. Queued calls are useless without one.
- [ ] Run the readiness check in **Playground** and close the gaps it finds. Aim for 100% before
      anyone outside sees the widget.
- [ ] Set your autonomy level deliberately. If an answer would be expensive to get wrong, keep it
      behind approval.
- [ ] Remove the demo workspace once yours is set up, or redeploy with `LOBBY_SEED_DEMO=false`.

## 4. Connect the channels you want

None of these are required to go live; the widget alone works on day one.

- [ ] **Website** — paste the one-line snippet from Install onto your site.
- [ ] **Email sending** — Integrations → Resend, with a from-address on a verified domain.
- [ ] **Password reset email** — `RESEND_API_KEY` + `AUTH_FROM_EMAIL`. Until both are set, a
      locked-out user cannot get back in on their own.
- [ ] **Inbound email** — `INBOUND_EMAIL_SECRET` *and* `INBOUND_EMAIL_DOMAIN`, then route mail to
      `POST /api/webhooks/email`. The webhook rejects everything until the secret is set.
- [ ] **SMS** — Integrations → Twilio, then point the number's webhook at
      `POST /api/webhooks/twilio`. Requests are signature-verified.
- [ ] **Calendar** — subscribe to the `.ics` URL from Integrations in Google, Apple or Outlook.

## 5. Watch the first week

- [ ] **Approvals** daily. That queue is where the assistant asks rather than guesses, and early
      on it is the best signal about whether your knowledge base is thin.
- [ ] **Gaps**, for the questions it could not answer. Each one is an article you have not
      written yet.
- [ ] **Your Anthropic spend.** The public chat endpoints are limited to 15 messages a minute per
      visitor and 240 an hour per workspace, but you should still know what a normal week costs
      before you find out the hard way.
- [ ] Skim the **Inbox** for replies that are technically correct but not how you'd say it, and
      fix the underlying article rather than the message.

## Known gaps

Listed honestly in `DEPLOY.md` § 6 — the short version: no email verification on sign-up, several
listed integrations are not implemented, and SQLite means one instance. None of them stop you
publishing; all of them are worth knowing before a customer finds them.
