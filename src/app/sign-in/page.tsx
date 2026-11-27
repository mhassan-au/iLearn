// Sign-in for accounts provisioned by the project owner.
import { redirect } from "next/navigation";
import { requestClient } from "../../lib/supabase";
import { signIn } from "./actions";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const client = await requestClient();
  const session = await client?.auth.getClaims();
  if (session?.data?.claims.sub) redirect("/dashboard");
  return (
    <section className="panel max-w-lg space-y-5">
      <h1>Sign in</h1>
      {client ? (
        <form action={signIn} className="space-y-4">
          {error && <p role="alert">{error === "unavailable"
            ? "Sign-in is temporarily unavailable. Try again in a moment."
            : error === "input"
              ? "Enter your email or iLearn username, and your password."
              : "Could not sign in. Check your email or username and password, then try again."}</p>}
          <label className="block">Email or username<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} required /></label>
          <label className="block">Password<input name="password" type="password" autoComplete="current-password" maxLength={1024} required /></label>
          <button className="button" type="submit">Sign in</button>
        </form>
      ) : <p>Sign-in is unavailable. Check that Supabase is configured with the project URL and publishable key.</p>}
    </section>
  );
}
