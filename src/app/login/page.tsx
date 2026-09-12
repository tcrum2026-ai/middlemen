import Link from "next/link";
import LoginForm from "@/components/forms/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Log in</h1>
      <p className="mt-1 text-sm text-stone-600">Welcome back to DealBridge.</p>
      <div className="mt-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-stone-600">
        No account yet?{" "}
        <Link href="/signup" className="font-semibold text-stone-900 underline hover:text-stone-600">
          Sign up
        </Link>
      </p>
    </div>
  );
}
