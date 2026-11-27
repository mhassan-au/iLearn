"use server";

// Authenticate provisioned usernames through Supabase Auth's email provider.
import { redirect } from "next/navigation";
import { requestClient } from "../../lib/supabase";

export async function signIn(form: FormData) {
  const client = await requestClient();
  if (!client) redirect("/sign-in");
  const username = form.get("username");
  const password = form.get("password");
  const normalized = typeof username === "string" ? username.trim().toLowerCase() : "";
  if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(normalized) ||
      typeof password !== "string" || !password || password.length > 1024) {
    redirect("/sign-in?error=1");
  }
  const { error } = await client.auth.signInWithPassword({
    email: `${normalized}@ilearn.invalid`,
    password,
  });
  if (error) redirect("/sign-in?error=1");
  redirect("/dashboard");
}

export async function signOut() {
  const client = await requestClient();
  if (client) await client.auth.signOut({ scope: "local" });
  redirect("/sign-in");
}
