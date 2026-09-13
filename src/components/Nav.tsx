import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import MobileNav from "@/components/MobileNav";

export default async function Nav() {
  const user = await getCurrentUser();

  const dashboardHref =
    user?.role === "ADMIN"
      ? "/dashboard/admin"
      : user?.role === "BUSINESS"
        ? "/dashboard/business"
        : "/dashboard/customer";

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-xl font-semibold text-stone-900"
        >
          DealBridge
        </Link>
        <nav className="text-sm font-medium text-stone-600">
          <MobileNav>
            <Link href="/businesses" className="hover:text-stone-900">
              Directory
            </Link>
            <Link href="/how-it-works" className="hover:text-stone-900">
              How it works
            </Link>
            {user ? (
              <>
                <Link href={dashboardHref} className="hover:text-stone-900">
                  Dashboard
                </Link>
                <Link href="/dashboard/settings" className="hover:text-stone-900">
                  Settings
                </Link>
                <span className="text-stone-400">{user.name}</span>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="rounded-md border border-stone-300 px-3 py-1.5 text-stone-700 hover:bg-stone-50"
                  >
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-stone-900">
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md bg-stone-900 px-3 py-1.5 text-white hover:bg-stone-800"
                >
                  Sign up
                </Link>
              </>
            )}
          </MobileNav>
        </nav>
      </div>
    </header>
  );
}
