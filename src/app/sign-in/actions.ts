"use server";

// Authenticate provisioned email addresses and iLearn usernames through Supabase.
import { redirect } from "next/navigation";
import { requestClient } from "../../lib/supabase";

export async function signIn(form: FormData) {
  const client = await requestClient();
  if (!client) redirect("/sign-in");
  const username = form.get("username");
  const password = form.get("password");
  // Full email addresses use the Supabase account directly. Bare usernames use the internal domain.
  const normalized = typeof username === "string" ? username.trim().toLowerCase() : "";
  const email = /^[a-z0-9][a-z0-9_-]{2,31}$/.test(normalized) ? `${normalized}@ilearn.invalid` : normalized;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(email) ||
      typeof password !== "string" || !password || password.length > 1024) {
    redirect("/sign-in?error=input");
  }
  const captchaToken = form.get("captchaToken");
  if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() &&
    (typeof captchaToken !== "string" || !captchaToken || captchaToken.length > 2048)) {
    redirect("/sign-in?error=captcha");
  }
  const { error } = await client.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken: typeof captchaToken === "string" && captchaToken.length <= 2048 ? captchaToken : undefined },
  });
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Supabase password sign-in failed", { status: error.status, code: error.code, type: error.name });
    }
    if (error.code === "captcha_failed") redirect("/sign-in?error=captcha");
    if (error.status === 429) redirect("/sign-in?error=rate-limit");
    if (error.name === "AuthRetryableFetchError" || (error.status ?? 0) >= 500) {
      redirect("/sign-in?error=unavailable");
    }
    redirect("/sign-in?error=credentials");
  }
  redirect("/dashboard?notice=signed-in");
}

export async function signOut() {
  const client = await requestClient();
  if (client) {
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) redirect("/account?notice=sign-out-failed");
  }
  redirect("/sign-in?notice=signed-out");
}
