import Link from "next/link";
import { CheckIcon } from "@/components/icons";
import { Logo } from "@/components/ui";
import { completeEmailVerification, verificationAvailable } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirm your email" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  ensureSeeded();
  const token = (await searchParams).token?.trim() ?? "";

  const result = !verificationAvailable()
    ? { ok: false as const, error: "This deployment cannot send email, so there is nothing to confirm." }
    : token
      ? completeEmailVerification(token)
      : { ok: false as const, error: "That link is missing its token. Ask for a new one from your dashboard." };

  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-5 py-12">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>

        {result.ok ? (
          <>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-jade-500/15">
              <CheckIcon width={24} height={24} className="text-jade-400" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">That&apos;s confirmed</h1>
            <p className="mt-2 text-sm text-mist-400">
              {result.user.email} is verified. Your assistant can answer customers now.
            </p>
            <Link href="/dashboard" className="btn btn-primary mt-6 w-full justify-center">
              Go to your dashboard
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">We couldn&apos;t confirm that</h1>
            <p className="mt-2 text-sm text-mist-400">{result.error}</p>
            <Link href="/dashboard" className="btn btn-primary mt-6 w-full justify-center">
              Open your dashboard
            </Link>
            <p className="mt-4 text-xs text-mist-400">
              Signed out?{" "}
              <Link href="/signin" className="link">
                Sign in
              </Link>{" "}
              and the dashboard will offer you a fresh link.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
