import { getCommissionRate } from "@/lib/commission";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  const commissionPercent = Math.round(getCommissionRate() * 1000) / 10;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-stone-500">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-stone-700">
        <section>
          <h2 className="text-base font-semibold text-stone-900">1. What DealBridge is</h2>
          <p className="mt-2">
            DealBridge is a marketplace that connects customers who need a service with
            businesses who can provide it. Customers post requests; businesses submit competing
            offers; customers choose one and pay through the platform. DealBridge does not
            perform, supervise, or guarantee the underlying work — we facilitate the introduction
            and the payment, nothing more.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-900">2. Commission and payment</h2>
          <p className="mt-2">
            Posting a request, browsing the directory, and submitting offers are free. When a
            customer accepts an offer and pays for the resulting deal, DealBridge deducts a{" "}
            {commissionPercent}% commission from that payment before passing the remainder to the
            business. This is the only fee DealBridge charges, and it is never charged upfront or
            for browsing.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-900">3. No warranty on business work</h2>
          <p className="mt-2">
            Businesses listed on DealBridge are independent third parties, not employees or
            agents of DealBridge. We do not inspect, license-check, or guarantee the quality,
            safety, or completion of any work performed. Any dispute about the work itself is
            between the customer and the business — DealBridge&apos;s in-deal messaging exists to
            help resolve this directly, but DealBridge is not a party to that agreement and
            assumes no liability for it.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-900">4. Directory listings</h2>
          <p className="mt-2">
            Some businesses appear in the directory without having created an account —
            DealBridge or its administrators add these listings from public sources so customers
            can discover real local businesses even before those businesses sign up. A business
            owner can claim their own listing to manage it directly. If you believe a listing
            about your business is inaccurate or you&apos;d like it removed, contact us using the
            details below.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-900">5. Reviews</h2>
          <p className="mt-2">
            Reviews may only be posted by customers who have used or contracted with a business
            through DealBridge. A business&apos;s star rating is only shown publicly once it has
            received a minimum number of reviews, to avoid a single review misleadingly
            representing a business. Fraudulent, abusive, or off-topic reviews may be removed at
            DealBridge&apos;s discretion.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-900">6. Account responsibilities</h2>
          <p className="mt-2">
            You are responsible for keeping your account credentials confidential and for all
            activity under your account. Claiming a business listing that is not yours, posting
            false information, or attempting to manipulate ratings or matching results is grounds
            for account termination.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-900">7. Changes</h2>
          <p className="mt-2">
            We may update these terms as the platform evolves. Continued use of DealBridge after a
            change means you accept the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-900">8. Contact</h2>
          <p className="mt-2">
            Questions about these terms, or requests regarding a directory listing (including
            removal), should be directed to DealBridge&apos;s support contact.
          </p>
        </section>
      </div>
    </div>
  );
}
