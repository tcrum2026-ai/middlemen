import Link from "next/link";
import { Logo } from "@/components/ui";
import { INDUSTRIES } from "@/lib/industries";
import { VERSUS } from "@/lib/versus";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-800 py-12">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo className="text-mist-100" />
            <p className="mt-3 max-w-xs text-sm text-mist-400">
              AI for the messages. People for the calls. A front desk that never sleeps and never oversteps.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Product</h3>
            <ul className="mt-3 space-y-2 text-sm text-mist-400">
              <li><Link className="hover:text-mist-100" href="/tour">Tour</Link></li>
              <li><Link className="hover:text-mist-100" href="/templates">Starter packs</Link></li>
              <li><Link className="hover:text-mist-100" href="/security">Security</Link></li>
              <li><Link className="hover:text-mist-100" href="/#pricing">Pricing</Link></li>
              <li><Link className="hover:text-mist-100" href="/dashboard">Live dashboard</Link></li>
              <li><Link className="hover:text-mist-100" href="/dashboard/install">Install</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">For your trade</h3>
            <ul className="mt-3 space-y-2 text-sm text-mist-400">
              {INDUSTRIES.map((industry) => (
                <li key={industry.slug}>
                  <Link className="hover:text-mist-100" href={`/for/${industry.slug}`}>
                    {industry.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Compared with</h3>
            <ul className="mt-3 space-y-2 text-sm text-mist-400">
              {VERSUS.map((item) => (
                <li key={item.slug}>
                  <Link className="hover:text-mist-100" href={`/vs/${item.slug}`}>
                    {item.name}
                  </Link>
                </li>
              ))}
              <li><Link className="hover:text-mist-100" href="/signup">Connect your business</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-ink-800 pt-6 text-xs text-mist-400">
          <p>© {new Date().getFullYear()} Middlemen</p>
          <p>Built as a demonstration product — no real customer data lives here.</p>
        </div>
      </div>
    </footer>
  );
}
