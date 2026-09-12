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
      <section className="bg-gradient-to-b from-indigo-50 to-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <p className="mb-4 inline-block rounded-full bg-indigo-100 px-4 py-1 text-sm font-semibold text-indigo-700">
            AI-matched deals, no back-and-forth
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Post what you need. Let businesses compete. Let AI find your best deal.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            DealBridge is the middleman that works for you: customers describe what they want,
            real businesses submit competing offers, and our AI ranks every offer on price,
            rating, and delivery — so you always see the best deal first. We only make money when
            you do: a {commissionPercent}% commission on completed deals, nothing upfront.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup?role=CUSTOMER"
              className="w-full rounded-md bg-indigo-600 px-6 py-3 text-center font-semibold text-white shadow-sm hover:bg-indigo-700 sm:w-auto"
            >
              I&apos;m looking for a deal
            </Link>
            <Link
              href="/signup?role=BUSINESS"
              className="w-full rounded-md border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-800 shadow-sm hover:bg-slate-50 sm:w-auto"
            >
              I want to win customers
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-4 text-center sm:grid-cols-3 sm:px-6">
          <Stat value={`${businessCount}+`} label="Businesses ready to bid" />
          <Stat value={completedDealCount.toString()} label="Deals completed" />
          <Stat
            value={reviewStats._count > 0 ? reviewStats._avg.rating!.toFixed(1) : "—"}
            label={reviewStats._count > 0 ? `Avg. rating (${reviewStats._count} reviews)` : "No reviews yet"}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-slate-900">How it works</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          <Step
            number="1"
            title="Post a request"
            description="Customers describe what they need and their budget — a service, a product, a project."
          />
          <Step
            number="2"
            title="Businesses compete"
            description="Relevant businesses submit real offers: price, delivery time, and details."
          />
          <Step
            number="3"
            title="AI finds the best deal"
            description="Our AI scores every offer on value — price vs. budget, ratings, and speed — and explains why."
          />
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900">Simple, aligned pricing</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">
            Posting a request and submitting offers is always free. DealBridge only takes a{" "}
            {commissionPercent}% commission on the final deal amount when a customer accepts an
            offer and the deal is paid — so we only win when you do.
          </p>
        </div>
      </section>

      <section className="border-t border-slate-200 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900">Frequently asked questions</h2>
          <div className="mt-10 space-y-6">
            <Faq
              question="How does DealBridge know which offer is actually the best?"
              answer="Our AI scores every offer on price relative to your stated budget, the business's real rating from past customer reviews, and delivery time — then explains its reasoning in plain language so you can decide for yourself."
            />
            <Faq
              question="Can I trust the businesses on here?"
              answer="Every business rating you see is a live average of real reviews left by customers after a completed deal — not a static claim. New businesses without reviews yet are shown honestly as new."
            />
            <Faq
              question="What if I'm not happy with the work?"
              answer="You can message the business directly on your deal page to work things out. DealBridge doesn't perform the work itself — it connects you with businesses and facilitates payment."
            />
            <Faq
              question="When do I get charged?"
              answer={`Only when you accept an offer and pay for the resulting deal. DealBridge takes its ${commissionPercent}% commission from that payment — never upfront, and never for browsing or posting.`}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-3xl font-extrabold text-indigo-600">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
        {number}
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}

function Faq({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">{question}</h3>
      <p className="mt-2 text-sm text-slate-600">{answer}</p>
    </div>
  );
}
