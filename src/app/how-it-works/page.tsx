import { getCommissionRate } from "@/lib/commission";

export default function HowItWorksPage() {
  const commissionPercent = Math.round(getCommissionRate() * 1000) / 10;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-stone-900">How DealBridge works</h1>

      <div className="mt-10 space-y-10">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">For customers</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-stone-600">
            <li>Post a request describing what you need and your budget.</li>
            <li>Businesses in that category submit competing offers.</li>
            <li>
              Our AI scores every offer on price vs. budget, business rating, and delivery time —
              and explains its reasoning in plain language.
            </li>
            <li>Accept the offer you like best. We handle the deal and take a commission only then.</li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-stone-900">For businesses</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-stone-600">
            <li>Create a business profile with your category and description.</li>
            <li>Browse open requests that match what you offer.</li>
            <li>Submit a competitive offer: your price, delivery time, and details.</li>
            <li>Win the deal, get paid, and mark the job complete.</li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-stone-900">Pricing</h2>
          <p className="mt-3 text-stone-600">
            Posting requests and submitting offers are always free. DealBridge takes a{" "}
            {commissionPercent}% commission of the final deal amount, deducted from the business&apos;s
            payout when a deal is paid. There are no upfront fees for either side.
          </p>
        </div>
      </div>
    </div>
  );
}
