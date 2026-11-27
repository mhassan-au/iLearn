"use client";

// Keep the authoring JSON while previewing or correcting validation errors.
import { useActionState, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { importTopic } from "./actions";
import { ActionButton } from "../components/action-button";
import { Toast } from "../components/toast";

export function ImportForm() {
  const [raw, setRaw] = useState("");
  const [state, action, pending] = useActionState(importTopic, {});
  return <form action={action} className="space-y-4">
    <label className="block">Topic JSON (schema 1.0)
      <textarea name="payload" rows={10} required value={raw} onChange={(event) => setRaw(event.target.value)}
        className="mt-2 block w-full rounded-lg border border-[var(--border)] p-3 font-mono text-sm" />
    </label>
    <div className="flex flex-wrap gap-3">
      <ActionButton name="intent" value="preview" disabled={pending} pendingLabel="Validating…">Validate and preview</ActionButton>
      <ActionButton name="intent" value="import" disabled={pending} pendingLabel="Saving draft…">Save as draft</ActionButton>
    </div>
    {state.errors && <div role="alert"><h3 className="font-semibold">Fix these issues</h3>
      <ul className="list-disc pl-6">{state.errors.map((error, index) => <li key={index}>{error}</li>)}</ul>
    </div>}
    {state.saved && <Toast key={state.saved} message={`Saved ${state.saved} as a draft.`} />}
    {state.preview && <div className="space-y-3 rounded-lg border border-[var(--border)] p-4" role="status">
      <h3 className="font-semibold">{state.preview.title}</h3>
      <p>{state.preview.modules} modules · {state.preview.chapters} chapters · {state.preview.activities} activities</p>
      <p>{state.preview.updates} existing items will be updated. Imported items will be drafts.</p>
      {state.preview.lesson && <details>
        <summary className="cursor-pointer">First lesson preview</summary>
        <div className="lesson-body mt-3"><Markdown skipHtml remarkPlugins={[remarkGfm]}>{state.preview.lesson}</Markdown></div>
      </details>}
    </div>}
  </form>;
}
