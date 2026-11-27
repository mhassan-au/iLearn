// Sign-in for accounts provisioned by the project owner.
import { supabaseConfig } from "../../lib/supabase";
import { signIn } from "./actions";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <section className="panel max-w-lg space-y-5">
      <h1>Sign in</h1>
      {supabaseConfig() ? (
        <form action={signIn} className="space-y-4">
          {error && <p role="alert">Could not sign in. Check your email and password and try again.</p>}
          <label className="block">Email<input name="email" type="email" autoComplete="username" maxLength={254} required /></label>
          <label className="block">Password<input name="password" type="password" autoComplete="current-password" maxLength={1024} required /></label>
          <button className="button" type="submit">Sign in</button>
        </form>
      ) : <p>Sign-in becomes available once Supabase is configured.</p>}
    </section>
  );
}
