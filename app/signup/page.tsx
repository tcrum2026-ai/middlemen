import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { signUpAction } from "@/app/auth-actions";
import { Logo } from "@/components/ui";
import { CheckIcon } from "@/components/icons";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Create your account" };

const PROMISES = [
  "14 days free, no card",
  "Live in under ten minutes",
  "Export or delete everything at any time",
];

export default async function SignUpPage() {
  if (await currentUser()) redirect("/dashboard");

  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mb-6 text-center text-sm text-mist-400">Then you&apos;ll set up your assistant.</p>
        <AuthForm mode="signup" action={signUpAction} />

        <ul className="mt-6 space-y-2">
          {PROMISES.map((promise) => (
            <li key={promise} className="flex items-center justify-center gap-2 text-xs text-mist-400">
              <CheckIcon width={13} height={13} className="text-jade-400" />
              {promise}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
