import Link from "next/link";
import ForgotPasswordForm from "@/components/forms/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Reset your password</h1>
      <p className="mt-1 text-sm text-stone-600">
        Enter the email on your account and we&apos;ll send you a link to reset your password.
      </p>
      <div className="mt-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <ForgotPasswordForm />
      </div>
      <p className="mt-6 text-center text-sm text-stone-600">
        <Link href="/login" className="font-semibold text-stone-900 underline hover:text-stone-600">
          Back to login
        </Link>
      </p>
    </div>
  );
}
