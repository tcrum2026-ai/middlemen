import Link from "next/link";
import ResetPasswordForm from "@/components/forms/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold text-stone-900">Invalid reset link</h1>
        <p className="mt-2 text-sm text-stone-600">
          This password reset link is missing its token. Please request a new one.
        </p>
        <p className="mt-4">
          <Link href="/forgot-password" className="font-semibold text-stone-900 underline hover:text-stone-600">
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Choose a new password</h1>
      <div className="mt-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}
