// Sign-in for accounts provisioned by the project owner.
import { redirect } from "next/navigation";
import { requestClient } from "../../lib/supabase";
import { signIn } from "./actions";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string; expired?: string }> }) {
  const { error, sent, expired } = await searchParams;
  const client = await requestClient();
  const session = await client?.auth.getClaims();
  if (session?.data?.claims.sub) redirect("/dashboard");
  return (
    <section className="panel max-w-lg space-y-5">
      <h1>Sign in</h1>
      {client ? (
        <form action={signIn} className="space-y-4">
          {error && <p role="alert">Enter a valid email address.</p>}
          {expired && <p role="alert">This link is invalid, expired or already used. Request a new link below.</p>}
          {sent && <p role="status">If your account is enabled, you’ll receive a sign-in link by email. Check your spam folder too.</p>}
          <label className="block">Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
          <button className="button" type="submit">Email me a sign-in link</button>
        </form>
      ) : <p>Sign-in becomes available once Supabase is configured.</p>}
    </section>
  );
}
