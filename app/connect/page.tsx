import Link from "next/link";
import { ConnectWizard } from "./connect-wizard";
import { Logo } from "@/components/ui";

export const metadata = { title: "Connect your business — Middlemen" };

export default function ConnectPage() {
  return (
    <div className="min-h-screen bg-ink-950">
      <header className="border-b border-ink-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/dashboard" className="text-sm text-mist-400 hover:text-mist-100">
            Skip to demo workspace
          </Link>
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
