"use client";

// Announce a saved result and allow it to be dismissed without moving focus.
import { useEffect, useState } from "react";

export function Toast({ message, tone = "success" }: { message: string; tone?: "success" | "error" }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(timeout);
  }, []);
  if (!visible) return null;
  return <div className={`toast toast-${tone}`}>
    <span className="toast-icon" aria-hidden="true">{tone === "success" ? "✓" : "!"}</span>
    <p role={tone === "error" ? "alert" : "status"}>{message}</p>
    <button type="button" className="toast-close" onClick={() => setVisible(false)} aria-label="Dismiss notification">×</button>
  </div>;
}
