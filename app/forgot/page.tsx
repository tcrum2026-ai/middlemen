import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Reset your password" };

export default async function ForgotPage() {
  if (await currentUser()) redirect("/dashboard");

  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mb-6 text-center text-sm text-mist-400">
          We&apos;ll email you a link. It works once and expires in an hour.
        </p>
        <ForgotForm />
      </div>
    </div>
  );
}
