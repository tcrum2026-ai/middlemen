export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-stone-500">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-stone-700">
        <section>
          <h2 className="text-base font-semibold text-stone-900">What we collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Account info: name, email address, and a hashed (never plaintext) password.</li>
            <li>
              Business listing info: company name, category, description, phone, website,
              address, and hours — provided by the business owner, an administrator, or sourced
              from public business directories for listings that haven&apos;t been claimed yet.
            </li>
            <li>Request and offer content: whatever you write when posting a request or an offer.</li>
            <li>Reviews: your name (as entered at signup), star rating, and review text.</li>
            <li>Messages sent through in-deal messaging, visible only to the two parties on that deal.</li>
            <li>Payment processing is handled by our payment provider directly — we don&apos;t store card numbers.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-900">How we use it</h2>
          <p className="mt-2">
            To operate the marketplace: matching requests to businesses in your area, ranking
            offers, computing commission on completed deals, and displaying reviews and ratings.
            We do not sell your personal data to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-900">Directory listings sourced without an account</h2>
          <p className="mt-2">
            When a business hasn&apos;t signed up yet, we may add a basic public listing (name,
            category, address, phone, website) sourced from public directories such as Google
            Places, so customers can find real businesses in their area. That business&apos;s
            owner can claim the listing at any time to take control of it, or request its removal.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-900">Data retention and deletion</h2>
          <p className="mt-2">
            We retain account and transaction data for as long as your account is active. You can
            request deletion of your account and associated personal data at any time; requests
            and reviews tied to completed deals may be retained in de-identified form for
            marketplace integrity (e.g., commission records).
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-900">Your rights</h2>
          <p className="mt-2">
            You can request a copy of the personal data we hold about you, ask us to correct
            inaccurate data, or request deletion, by contacting DealBridge&apos;s support contact.
          </p>
        </section>
      </div>
    </div>
  );
}
