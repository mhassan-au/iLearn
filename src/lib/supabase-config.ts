// The SDK appends its own service paths to the Supabase project origin.
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key?.startsWith("sb_publishable_")) return null;
  const parsed = URL.parse(url);
  return parsed && ["https:", "http:"].includes(parsed.protocol)
    && parsed.href === parsed.origin + "/"
    ? { url: parsed.origin, key }
    : null;
}
