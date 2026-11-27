"use client";

// Keep commands selectable even when clipboard permissions are unavailable.
import { useState } from "react";

export function CopyCommand({ command }: { command: string }) {
  const [message, setMessage] = useState("");
  return <div className="space-y-2">
    <pre className="overflow-x-auto rounded-lg border border-[var(--border)] p-3"><code>{command}</code></pre>
    <button type="button" className="button" onClick={async () => {
      try {
        await navigator.clipboard.writeText(command);
        setMessage("Copied");
      } catch {
        setMessage("Please select and copy the command.");
      }
    }}>Copy command</button>
    <span className="ml-2 text-sm" role="status">{message}</span>
  </div>;
}
