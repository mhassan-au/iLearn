"use server";

// Authenticate provisioned usernames through Supabase Auth's email provider.
import { redirect } from "next/navigation";
import { requestClient } from "../../lib/supabase";

export async function signIn(form: FormData) {
  const client = await requestClient();
  if (!client) redirect("/sign-in");
  const username = form.get("username");
  const password = form.get("password");
  // Accept the username or its internal address as shown in Supabase Studio.
  const normalized = typeof username === "string"
    ? username.trim().toLowerCase().replace(/@ilearn\.invalid$/, "")
    : "";
  if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(normalized) ||
      typeof password !== "string" || !password || password.length > 1024) {
    redirect("/sign-in?error=input");
  }
  const { error } = await client.auth.signInWithPassword({
    email: `${normalized}@ilearn.invalid`,
    password,
  });
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Supabase password sign-in failed", { status: error.status, code: error.code, type: error.name });
    }
    if (error.name === "AuthRetryableFetchError" || (error.status ?? 0) >= 500) {
      redirect("/sign-in?error=unavailable");
    }
    redirect("/sign-in?error=credentials");
  }
  redirect("/dashboard");
}

export async function signOut() {
  const client = await requestClient();
  if (client) await client.auth.signOut({ scope: "local" });
  redirect("/sign-in");
}
