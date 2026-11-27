"use client";

// Store appearance locally so it applies across the whole app in this browser.
import { useEffect, useState } from "react";

const key = "ilearn-appearance";
type Theme = "system" | "light" | "dark";

function getTheme(): Theme {
  try {
    const preference = window.localStorage.getItem(key);
    return preference === "light" || preference === "dark" ? preference : "system";
  } catch { return "system"; }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function ApplyTheme() {
  useEffect(() => applyTheme(getTheme()), []);
  return null;
}

export function ThemePreference() {
  const [theme, setTheme] = useState<Theme>("system");
  const [message, setMessage] = useState("");
  useEffect(() => setTheme(getTheme()), []);
  return <fieldset className="space-y-3">
    <legend className="font-semibold">Appearance</legend>
    <div className="flex flex-wrap gap-2">
      {(["system", "light", "dark"] as const).map((option) => <label className="theme-option" key={option}>
        <input type="radio" name="theme" value={option} checked={theme === option} onChange={() => {
          setTheme(option);
          applyTheme(option);
          try {
            window.localStorage.setItem(key, option);
            setMessage("Appearance saved on this browser.");
          } catch { setMessage("Appearance changed for this visit."); }
        }} />
        <span>{option === "system" ? "Use system setting" : option === "light" ? "Light" : "Dark"}</span>
      </label>)}
    </div>
    <p className="text-sm" role="status">{message || "This setting applies to this browser."}</p>
  </fieldset>;
}
