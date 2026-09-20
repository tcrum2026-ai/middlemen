import Link from "next/link";
import { redirect } from "next/navigation";
import { ConnectWizard } from "./connect-wizard";
import { Logo } from "@/components/ui";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Connect your business — Lobby" };

export default async function ConnectPage() {
  const user = await currentUser();
  if (!user) redirect("/signup");

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="border-b border-ink-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/">
            <Logo />
          </Link>
          <span className="text-sm text-mist-400">Signed in as {user.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Connect your business</h1>
          <p className="mt-2 max-w-2xl text-mist-400">
            Four short steps. No card, no sales call. At the end you get a workspace and one line of code to paste on
            your site.
          </p>
        </div>
        <ConnectWizard />
      </main>
    </div>
  );
}
