import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NewRequestForm from "@/components/forms/NewRequestForm";

export default async function NewRequestPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Post a new request</h1>
      <p className="mt-1 text-sm text-slate-600">
        Be specific — better detail means better-matched offers.
      </p>
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <NewRequestForm />
      </div>
    </div>
  );
}
