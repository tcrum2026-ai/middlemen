import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, Clause, LegalPage } from "@/components/marketing/legal-page";
import { LEGAL, orBlank } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "The terms of using Lobby: what the assistant will and will not do, what you are responsible for, billing and " +
    "cancellation, and the limits of what we promise.",
  alternates: { canonical: "/terms" },
};

const entity = orBlank(LEGAL.entity, "NEXT_PUBLIC_LEGAL_ENTITY");
const contact = orBlank(LEGAL.contactEmail, "NEXT_PUBLIC_CONTACT_EMAIL");
const jurisdiction = orBlank(LEGAL.jurisdiction, "NEXT_PUBLIC_LEGAL_JURISDICTION");

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      intro="The deal, in the same plain language as the rest of the site. Using Lobby means accepting what is below."
    >
      <Clause heading="What the service is">
        <p>
          Lobby, operated by {entity}, answers messages sent to your business across web chat, email and SMS. It
          answers from the knowledge base you write, books against the availability you configure, captures leads,
          drafts quotes, and hands anything risky or unanswerable to a person on your team.
        </p>
        <p>
          With voice switched on, it also answers your phone number: it speaks with callers, books and quotes on the
          same records, and transfers to your team when asked or when the conversation reaches something it is not
          allowed to decide. Answering calls is off until you turn it on.
        </p>
      </Clause>

      <Clause heading="What you are responsible for">
        <Bullets
          items={[
            "The accuracy of your knowledge base. The assistant answers from what you wrote; if a price there is wrong, it will quote the wrong price.",
            "The settings you choose, including which actions send without approval and what your approval limits are.",
            "Having the right to use the customer data you put into the service, and honouring your own obligations to those customers.",
            "Keeping your account credentials to yourself, and removing teammates who leave.",
            "Whatever the assistant says on your behalf, in writing or out loud, exactly as if a member of your staff had said it.",
            "Your obligations around calls: disclosing and obtaining consent for any recording you switch on, and honouring do-not-call rules — under the law where you are and where your callers are. We disclose that the assistant is an AI on every call; the rest is yours.",
          ]}
        />
      </Clause>

      <Clause heading="What the assistant will get wrong">
        <p>
          It is a language model reading your notes. It will sometimes misread a question, pick the wrong article, or
          phrase something in a way you would not have. The product is built to make that survivable — refusing when
          nothing matches instead of guessing, holding refunds, disputes and large quotes for approval, logging every
          tool call and every article it read — but none of that makes it correct every time.
        </p>
        <p>
          Review the{" "}
          <Link href="/dashboard/approvals" className="link">
            approval queue
          </Link>{" "}
          and set your autonomy level deliberately. If an answer would be expensive to get wrong, keep it behind
          approval.
        </p>
      </Clause>

      <Clause heading="Acceptable use">
        <p>You may not use the service to:</p>
        <Bullets
          items={[
            "Claim the assistant is a human being, or configure it to deny being AI when asked. The spoken disclosure at the start of a call may be reworded, never removed or defeated.",
            "Use the voice feature for outbound campaigns, cold calls or any automated dialling. Lobby answers calls placed to you; it does not place them, and the terms do not permit using it as a robodialler.",
            "Send unsolicited bulk messages, or contact people who have asked you to stop.",
            "Handle categories of data the service does not claim to protect — health records, card numbers, government identifiers — without your own legal basis and a written agreement with us.",
            "Attempt to reach another workspace's data, or to work around the rate limits on the public endpoints.",
            "Break the law in your jurisdiction or your customers'.",
          ]}
        />
      </Clause>

      <Clause heading="Trial, billing and cancellation">
        <Bullets
          items={[
            "The trial runs 14 days and needs no card. If you do not subscribe, the workspace stops answering; your data stays exportable.",
            "Paid plans bill monthly or yearly in advance. A conversation means one customer thread, however many messages it contains.",
            "Answered call minutes beyond your plan's allowance are billed in arrears at the per-minute rate shown on the pricing page, measured to the second. Your telephony provider bills you separately for the underlying phone number and carrier charges.",
            "Cancelling takes effect at the end of the period you have paid for. There is no cancellation fee and no retention call.",
            "No refund for the unused part of a period you cancel partway through. If you were charged in error — a double charge, a plan change that didn't take, anything that looks like our mistake — email us within 14 days of the charge and we will refund it once we've checked.",
            "Your export works whether or not the subscription is current.",
          ]}
        />
      </Clause>

      <Clause heading="Availability">
        <p>
          We aim to keep the service running and will fix what breaks, but no uptime percentage is promised on this
          page and none is owed. The service depends on Anthropic&apos;s API and on whichever providers you connect;
          when one of them is down, the corresponding feature is down. If the assistant cannot answer, messages are
          still captured and queued for a person rather than lost.
        </p>
      </Clause>

      <Clause heading="Ending it">
        <p>
          You can delete your workspace at any time, from Settings, without asking us. We may suspend an account that
          breaks the acceptable-use terms above, or that is not paid for; where we reasonably can, we will tell you
          first and give you a chance to export.
        </p>
      </Clause>

      <Clause heading="Liability">
        <p>
          To the extent the law allows, {entity} is not liable for indirect or consequential loss, for lost profit or
          business, or for anything the assistant said that your knowledge base told it to say. Total liability for
          any claim is limited to what you paid in the twelve months before it arose. Nothing here limits liability
          that cannot lawfully be limited.
        </p>
      </Clause>

      <Clause heading="Changes and governing law">
        <p>
          If these terms change in a way that matters, we will say so in the product before it takes effect rather
          than silently updating the date at the top. These terms are governed by the laws of {jurisdiction}.
        </p>
        <p>
          Questions: <span className="font-mono text-xs text-mist-200">{contact}</span>.
        </p>
      </Clause>
    </LegalPage>
  );
}
