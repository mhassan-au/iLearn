"use client";

// Supabase validates each one-time CAPTCHA token from the browser.
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ActionButton } from "../components/action-button";

type Turnstile = {
  render: (element: HTMLElement, options: {
    sitekey: string; callback: (token: string) => void;
    "expired-callback": () => void; "error-callback": () => void;
    "response-field": boolean; size: "flexible";
  }) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};

export function TurnstileButton({ siteKey }: { siteKey: string }) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const wasPending = useRef(false);
  const [api, setApi] = useState<Turnstile | null>(null);
  const [token, setToken] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const { pending } = useFormStatus();

  useEffect(() => {
    if (!api || !container.current) return;
    const id = api.render(container.current, {
      sitekey: siteKey, size: "flexible", "response-field": false,
      callback: (result) => { setToken(result); setUnavailable(false); },
      "expired-callback": () => { setToken(""); if (widget.current) api.reset(widget.current); },
      "error-callback": () => { setToken(""); setUnavailable(true); },
    });
    widget.current = id;
    return () => { widget.current = null; api.remove(id); };
  }, [api, siteKey]);

  useEffect(() => {
    if (wasPending.current && !pending) {
      setToken("");
      if (api && widget.current) api.reset(widget.current);
    }
    wasPending.current = pending;
  }, [api, pending]);

  return <div className="space-y-3">
    <Script id="turnstile" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      onReady={() => setApi((window as Window & { turnstile?: Turnstile }).turnstile ?? null)}
      onError={() => setUnavailable(true)} />
    <div ref={container} />
    <input type="hidden" name="captchaToken" value={token} />
    <p className="text-sm" role="status">{unavailable ? "The security check could not load. Try refreshing the page."
      : token ? "Security check complete." : "Complete the security check to sign in."}</p>
    <ActionButton className="button w-full" pendingLabel="Signing in…" disabled={!token}>Sign in</ActionButton>
  </div>;
}
