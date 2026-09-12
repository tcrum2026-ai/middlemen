import Link from "next/link";
import SignupForm from "@/components/forms/SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const defaultRole = role === "BUSINESS" ? "BUSINESS" : "CUSTOMER";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Create your account</h1>
      <p className="mt-1 text-sm text-stone-600">
        Join DealBridge as a customer looking for deals or a business ready to win them.
      </p>
      <div className="mt-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <SignupForm defaultRole={defaultRole} />
      </div>
      <p className="mt-6 text-center text-sm text-stone-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-stone-900 underline hover:text-stone-600">
          Log in
        </Link>
      </p>
    </div>
  );
}
