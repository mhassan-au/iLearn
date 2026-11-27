// Show the current learner's account and local appearance settings.
import { learningClient } from "../../lib/learning";
import { ActionButton } from "../components/action-button";
import { ThemePreference } from "../components/theme-preference";
import { signOut } from "../sign-in/actions";
import { Toast } from "../components/toast";

export default async function Account({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const client = await learningClient();
  const [{ data }, profile] = await Promise.all([
    client.auth.getClaims(),
    client.from("profiles").select("display_name,role").maybeSingle(),
  ]);
  const email = typeof data?.claims.email === "string" ? data.claims.email : "";
  const { notice } = await searchParams;
  return <div className="max-w-2xl space-y-6">
    {notice === "sign-out-failed" && <Toast tone="error" message="Could not sign out. Please try again." />}
    <h1>My account</h1>
    <section className="panel space-y-4">
      <h2>Profile</h2>
      <dl className="space-y-3">
        {profile.data?.display_name && <div><dt className="font-semibold">Name</dt><dd>{profile.data.display_name}</dd></div>}
        <div><dt className="font-semibold">Sign-in address</dt><dd className="break-all">{email || "Unavailable"}</dd></div>
        <div><dt className="font-semibold">Role</dt><dd>{profile.data?.role === "administrator" ? "Administrator" : "Learner"}</dd></div>
      </dl>
      <p className="text-sm">Password changes are managed by the project owner in Supabase.</p>
    </section>
    <section className="panel"><ThemePreference /></section>
    <form action={signOut}><ActionButton className="button button-secondary" pendingLabel="Signing out…">Sign out</ActionButton></form>
  </div>;
}
