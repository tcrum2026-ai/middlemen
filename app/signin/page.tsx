import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { signInAction } from "@/app/auth-actions";
import { Logo } from "@/components/ui";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await currentUser()) redirect("/dashboard");
  const { next } = await searchParams;

  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mb-6 text-center text-sm text-mist-400">Your inbox has been busy without you.</p>
        <AuthForm mode="signin" action={signInAction} next={next} />
        <p className="mt-6 text-center text-xs text-mist-400">
          Just looking?{" "}
          <Link href="/dashboard" className="link-quiet">
            Explore the demo workspace
          </Link>{" "}
          — no account needed.
        </p>
      </div>
    </div>
  );
}
