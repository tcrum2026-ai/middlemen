import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, Clause, LegalPage } from "@/components/marketing/legal-page";
import { LEGAL, orBlank } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Lobby stores, who processes it, how long it is kept, and how to export or delete it. Transcripts rather " +
    "than call audio, no tracking cookies, no training on your customers' messages.",
  alternates: { canonical: "/privacy" },
};

const entity = orBlank(LEGAL.entity, "NEXT_PUBLIC_LEGAL_ENTITY");
const contact = orBlank(LEGAL.contactEmail, "NEXT_PUBLIC_CONTACT_EMAIL");

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      intro="What we hold, who else sees it, and how to get it back or get rid of it — written from what the software actually does."
    >
      <Clause heading="Two kinds of data, two different roles">
        <p>
          <strong className="text-mist-100">Your account and workspace</strong> — your name, email address, a hash of
          your password, your business details, knowledge base, hours and settings. {entity} decides how this is
          handled, so for this data we are the controller.
        </p>
        <p>
          <strong className="text-mist-100">Your customers&apos; messages</strong> — what the people contacting your
          business write, along with any name, email address or phone number they give, and the appointments, leads
          and quotes that come out of those conversations. This is your data about your customers. You decide what
          the assistant is allowed to say and do with it; we process it on your instructions and nothing else.
        </p>
      </Clause>

      <Clause heading="What we never collect">
        <Bullets
          items={[
            "Call audio. When the assistant answers a call, we store the written transcript, not a recording. If you switch recording on at your telephony provider, that audio sits with them under your account and your consent obligations.",
            "Payment card numbers. If you connect Stripe, card details go to Stripe and never touch this service.",
            "Analytics, advertising or tracking cookies. There are no third-party scripts on this site at all.",
            "Your customers' messages as training data. Nothing you or your customers write is used to train a shared model.",
          ]}
        />
      </Clause>

      <Clause heading="Cookies">
        <p>Two, both first-party, both strictly necessary — there is no cookie banner because there is nothing to consent to:</p>
        <Bullets
          items={[
            "mm_session — keeps you signed in for 30 days. HTTP-only, SameSite=Lax, and Secure in production.",
            "mm_business — remembers which of your workspaces you were last looking at.",
          ]}
        />
      </Clause>

      <Clause heading="Who else processes it">
        <p>
          Only the services needed to do the job, and — apart from the first — only the ones you choose to connect:
        </p>
        <Bullets
          items={[
            "Anthropic (Claude) — receives the conversation and your knowledge base in order to write each reply. Anthropic does not train on API traffic.",
            "Twilio — carries inbound and outbound SMS, and, when you enable it, answers calls: Twilio performs the speech-to-text and text-to-speech, so spoken words pass through them on the way to and from the assistant.",
            "Resend — if you connect it, sends confirmations, follow-ups and quotes from your address.",
            "Slack — if you connect it, receives notifications about queued calls and approvals.",
            "Stripe — if you connect it, creates payment links and handles the payment itself.",
            "Whoever hosts this deployment, who necessarily stores the database and serves the traffic.",
          ]}
        />
        <p>
          Disconnecting an integration stops it receiving anything further, immediately. Data it already received is
          governed by that provider&apos;s own policy.
        </p>
      </Clause>

      <Clause heading="How long it is kept">
        <p>
          Conversations, contacts, appointments, leads, quotes and knowledge articles are kept until you delete them
          or delete the workspace. There is no retention period that quietly keeps a copy afterwards. Sign-in sessions
          expire after 30 days and expired ones are removed from the database.
        </p>
      </Clause>

      <Clause heading="Getting it out, or getting rid of it">
        <p>
          Everything exports as CSV and JSON from{" "}
          <Link href="/dashboard/settings" className="text-jade-400 hover:underline">
            Settings
          </Link>{" "}
          — conversations, contacts, knowledge, call briefs, the lot — with no export fee and no support ticket.
          Deleting the workspace deletes its records.
        </p>
        <p>
          If one of your customers asks you to delete what you hold about them, you can do it yourself from the
          contact&apos;s page; it removes their messages along with the contact.
        </p>
      </Clause>

      <Clause heading="Telling people they are talking to a machine">
        <p>
          Every call the assistant answers opens by telling the caller they are speaking with an AI, before anything
          else is said. The wording is yours to set; the disclosure itself cannot be turned off. Several
          jurisdictions require it, and callers are entitled to know regardless.
        </p>
        <p>
          The chat widget carries the same notice, and asking for a person works on any channel — in a call it
          transfers you, in writing it queues a human.
        </p>
      </Clause>

      <Clause heading="Security">
        <p>
          Passwords are stored as scrypt hashes with a per-account salt, never in plain text. Session tokens are
          random 256-bit values stored only as SHA-256 hashes, so a database copy does not hand over live sessions.
          Every screen and every action is scoped to your workspace and re-checked on the server.
        </p>
        <p>
          No compliance certification is claimed on this page, because none has been audited. If your business needs
          a signed DPA, HIPAA coverage or SOC 2, ask before you rely on this for regulated work.
        </p>
      </Clause>

      <Clause heading="Asking us something">
        <p>
          Data protection questions, access requests and deletion requests go to{" "}
          <span className="font-mono text-xs text-mist-200">{contact}</span>. If you are one of our customers&apos;
          customers, contact that business directly — they hold the relationship and the data, and we act on their
          instructions.
        </p>
      </Clause>
    </LegalPage>
  );
}
