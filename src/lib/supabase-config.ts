// Use the project origin even when the copied dashboard URL includes an API path.
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const parsed = URL.parse(url);
  return parsed && ["https:", "http:"].includes(parsed.protocol)
    ? { url: parsed.origin, key }
    : null;
}
