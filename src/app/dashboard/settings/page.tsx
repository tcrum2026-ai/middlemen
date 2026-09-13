import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ChangePasswordForm from "@/components/forms/ChangePasswordForm";

export default async function AccountSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Account settings</h1>
      <p className="mt-1 text-sm text-stone-600">
        Signed in as <span className="font-medium text-stone-900">{user.email}</span>
      </p>

      <div className="mt-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-stone-900">Change password</h2>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
