import Link from "next/link";
import { Logo } from "@/components/ui";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">Choose a new password</h1>

        {token ? (
          <>
            <p className="mb-6 text-center text-sm text-mist-400">
              Last step. Pick something you haven&apos;t used elsewhere.
            </p>
            <ResetForm token={token} />
          </>
        ) : (
          <div className="mt-6 space-y-4 text-center">
            <p className="rounded-lg border border-amber-glow/30 bg-amber-glow/[0.06] px-4 py-3 text-sm leading-relaxed text-mist-200">
              This link is missing its token. Reset links only work once, so if you have already used this one you
              will need a new one.
            </p>
            <Link href="/forgot" className="btn btn-primary justify-center">
              Send a new link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
