"use server";

// Authenticate with Supabase and keep credential errors generic.
import { redirect } from "next/navigation";
import { requestClient } from "../../lib/supabase";

export async function signIn(form: FormData) {
  const client = await requestClient();
  if (!client) redirect("/sign-in");
  const email = form.get("email");
  const password = form.get("password");
  if (typeof email !== "string" || typeof password !== "string" ||
      !email.trim() || email.length > 254 || !password || password.length > 1024) {
    redirect("/sign-in?error=1");
  }
  const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (error) redirect("/sign-in?error=1");
  redirect("/dashboard");
}

export async function signOut() {
  const client = await requestClient();
  if (client) await client.auth.signOut({ scope: "local" });
  redirect("/sign-in");
}
