// Sign-in for accounts provisioned by the project owner.
import { redirect } from "next/navigation";
import { requestClient } from "../../lib/supabase";
import { signIn } from "./actions";
import { ActionButton } from "../components/action-button";
import { Toast } from "../components/toast";
import { TurnstileButton } from "./turnstile-button";

const errors: Record<string, string> = {
  unavailable: "Sign-in is temporarily unavailable. Try again in a moment.",
  input: "Enter your email or iLearn username, and your password.",
  captcha: "Complete a fresh security check, then try again.",
  "rate-limit": "Too many requests. Wait a few minutes before trying again.",
};

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { error, notice } = await searchParams;
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const client = await requestClient();
  const session = await client?.auth.getClaims();
  if (session?.data?.claims.sub) redirect("/dashboard");
  return (
    <section className="panel sign-in-panel mx-auto max-w-lg space-y-5">
      {notice === "signed-out" && <Toast message="You’ve signed out." />}
      <h1>Sign in</h1>
      <p>Open your courses and pick up where you left off.</p>
      {client ? (
        <form action={signIn} className="space-y-4">
          {error && <p className="form-error" role="alert">{Object.hasOwn(errors, error)
            ? errors[error] : "Could not sign in. Check your email or username and password, then try again."}</p>}
          <label className="block">Email or username<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} required /></label>
          <label className="block">Password<input name="password" type="password" autoComplete="current-password" maxLength={1024} required /></label>
          {turnstileSiteKey ? <TurnstileButton siteKey={turnstileSiteKey} />
            : <ActionButton className="button w-full" pendingLabel="Signing in…">Sign in</ActionButton>}
        </form>
      ) : <p>Sign-in is unavailable. Check that Supabase is configured with the project URL and publishable key.</p>}
    </section>
  );
}
