import Link from "next/link";
import { getCommissionRate } from "@/lib/commission";
import { prisma } from "@/lib/db";

export default async function Home() {
  const commissionPercent = Math.round(getCommissionRate() * 1000) / 10;

  const [businessCount, completedDealCount, reviewStats] = await Promise.all([
    prisma.businessProfile.count(),
    prisma.deal.count({ where: { status: "COMPLETED" } }),
    prisma.review.aggregate({ _avg: { rating: true }, _count: true }),
  ]);

  return (
    <div>
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-amber-700">
              A marketplace that does the legwork
            </p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-[1.1] text-stone-900 sm:text-5xl">
              Describe the job. Real businesses bid on it. AI tells you who&apos;s actually worth
              hiring.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-stone-600">
              DealBridge already knows the businesses in your area — we build the directory so
              you don&apos;t have to search it. Post what you need, compare competing offers, and
              let our AI weigh price against real, verified reviews. We take a {commissionPercent}%
              cut only when a deal actually closes.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup?role=CUSTOMER"
                className="rounded-md bg-stone-900 px-6 py-3 text-center font-semibold text-white shadow-sm hover:bg-stone-800"
              >
                Post a request
              </Link>
              <Link
                href="/businesses"
                className="rounded-md border border-stone-300 bg-white px-6 py-3 text-center font-semibold text-stone-800 hover:bg-stone-50"
              >
                Browse the directory
              </Link>
            </div>
            <p className="mt-4 text-sm text-stone-500">
              Own a business?{" "}
              <Link href="/signup?role=BUSINESS" className="font-medium text-stone-900 underline">
                Claim your listing
              </Link>{" "}
              or add one — no cost to appear.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Live on DealBridge
            </p>
            <dl className="mt-4 divide-y divide-stone-200">
              <StatRow value={`${businessCount}`} label="Businesses in the directory" />
              <StatRow value={completedDealCount.toString()} label="Deals completed" />
              <StatRow
                value={reviewStats._count > 0 ? reviewStats._avg.rating!.toFixed(1) : "—"}
                label={
                  reviewStats._count > 0
                    ? `Average rating across ${reviewStats._count} reviews`
                    : "No reviews yet — be the first"
                }
              />
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="max-w-xl text-2xl font-semibold text-stone-900 sm:text-3xl">
          How it actually works
        </h2>
        <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-3">
          <Step
            number="01"
            title="Tell us the job and your ZIP"
            description="A price, a timeline, and enough detail that a real business can quote it accurately."
          />
          <Step
            number="02"
            title="We match it to businesses near you"
            description="Including ones that never signed up — we build the directory by area so you're never stuck with whoever bothered to register."
          />
          <Step
            number="03"
            title="Compare and pick, backed by real reviews"
            description="Every rating requires at least 3 real reviews before it's shown. No single review inflates or sinks a business."
          />
        </div>
      </section>

      <section className="border-y border-stone-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold text-stone-900 sm:text-3xl">
            Pricing that only works when you win
          </h2>
          <p className="mt-4 max-w-xl text-stone-600">
            Posting a request, browsing the directory, and submitting offers cost nothing.
            DealBridge takes a {commissionPercent}% commission on the final amount — and only once
            a customer accepts an offer and the deal is paid.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="text-2xl font-semibold text-stone-900 sm:text-3xl">
          Questions people actually ask
        </h2>
        <div className="mt-8 divide-y divide-stone-200 border-y border-stone-200">
          <Faq
            question="How do businesses end up on here without signing up?"
            answer="We add listings ourselves by searching for real businesses in a given area — the same way a directory like Yelp seeds itself. A business can claim its listing later to manage offers directly, or a customer can request one we haven't found yet."
          />
          <Faq
            question="How does the AI decide which offer is best?"
            answer="It weighs price against your stated budget, delivery time, and the business's real review-based rating — then writes out its reasoning in plain language so you can second-guess it."
          />
          <Faq
            question="Can I trust the ratings?"
            answer="A business needs at least 3 real customer reviews before any rating shows publicly. Below that, we show it plainly as new rather than faking a number."
          />
          <Faq
            question="When do I actually get charged?"
            answer={`Only after you accept an offer and the resulting deal is paid. The ${commissionPercent}% commission comes out of that payment — never for posting, browsing, or bidding.`}
          />
        </div>
      </section>
    </div>
  );
}

function StatRow({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <span className="text-sm text-stone-600">{label}</span>
      <span className="text-xl font-semibold text-stone-900">{value}</span>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="border-l-2 border-amber-500 pl-5">
      <p className="text-sm font-semibold text-amber-700">{number}</p>
      <h3 className="mt-2 font-semibold text-stone-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{description}</p>
    </div>
  );
}

function Faq({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="py-6">
      <h3 className="font-semibold text-stone-900">{question}</h3>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{answer}</p>
    </div>
  );
}
