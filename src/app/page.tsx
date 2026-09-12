import Link from "next/link";
import { getCommissionRate } from "@/lib/commission";

export default function Home() {
  const commissionPercent = Math.round(getCommissionRate() * 1000) / 10;

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
            verified businesses submit real offers, and our AI ranks every offer on price, quality,
            and delivery — so you always see the best deal first. We only make money when you do:
            a {commissionPercent}% commission on completed deals, nothing upfront.
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
