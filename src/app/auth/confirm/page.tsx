// Require a form submission so email scanners can open the link without consuming it.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { confirmSignIn } from "../../sign-in/actions";

export const metadata: Metadata = { title: "Confirm sign-in", referrer: "no-referrer", robots: { index: false } };

export default async function Confirm({ searchParams }: { searchParams: Promise<{ token_hash?: string }> }) {
  const { token_hash } = await searchParams;
  if (typeof token_hash !== "string" || !/^[a-zA-Z0-9_-]{1,256}$/.test(token_hash)) {
    redirect("/sign-in?expired=1");
  }
  return (
    <section className="panel max-w-lg space-y-5">
      <h1>Confirm sign-in</h1>
      <p>Only continue if you requested this email to sign in to SelfLearn.</p>
      <form action={confirmSignIn}>
        <input type="hidden" name="token_hash" value={token_hash} />
        <button className="button" type="submit">Continue to My learning</button>
      </form>
    </section>
  );
}
