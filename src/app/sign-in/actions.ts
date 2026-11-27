"use server";

// Request a one-time link without revealing whether the account exists.
import { redirect } from "next/navigation";
import { requestClient } from "../../lib/supabase";

export async function signIn(form: FormData) {
  const client = await requestClient();
  if (!client) redirect("/sign-in");
  const email = String(form.get("email") ?? "").trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/sign-in?error=1");
  }
  await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  redirect("/sign-in?sent=1");
}

export async function confirmSignIn(form: FormData) {
  const client = await requestClient();
  const hash = form.get("token_hash");
  if (!client || typeof hash !== "string" || !/^[a-zA-Z0-9_-]{1,256}$/.test(hash)) {
    redirect("/sign-in?expired=1");
  }
  const { error } = await client.auth.verifyOtp({ token_hash: hash, type: "email" });
  if (error) redirect("/sign-in?expired=1");
  redirect("/dashboard");
}

export async function signOut() {
  const client = await requestClient();
  if (client) await client.auth.signOut({ scope: "local" });
  redirect("/sign-in");
}
