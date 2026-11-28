"use client";

// Match saved quotes back to the rendered activity without rewriting its markup.
import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { saveAnnotation } from "./annotation-actions";

export type Annotation = { id: string; activity_id: string; quote: string; text_offset: number; body: string };
type Anchor = { quote: string; offset: number };
type Editor = Anchor & { id?: string; body: string };

function readAnchor(root: HTMLElement): Anchor | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const endpointInsideControl = (node: Node) =>
    (node instanceof Element ? node : node.parentElement)?.closest("button,input,textarea,select,summary");
  if (endpointInsideControl(range.startContainer) || endpointInsideControl(range.endContainer)) return null;
  const raw = range.toString();
  const quote = raw.trim();
  if (!quote || quote.length > 1500) return null;
  const preceding = document.createRange();
  preceding.selectNodeContents(root);
  preceding.setEnd(range.startContainer, range.startOffset);
  return { quote, offset: preceding.toString().length + (raw.length - raw.trimStart().length) };
}

function locate(root: HTMLElement, notes: Annotation[]) {
  const nodes: { node: Text; start: number }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let text = "";
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent) continue;
    nodes.push({ node: node as Text, start: text.length });
    text += node.textContent;
  }
  return notes.flatMap((note) => {
    let start = -1;
    for (let position = text.indexOf(note.quote); position >= 0; position = text.indexOf(note.quote, position + 1)) {
      if (start === -1 || Math.abs(position - note.text_offset) < Math.abs(start - note.text_offset)) start = position;
      if (start === note.text_offset) break;
    }
    if (start < 0) return [];
    const end = start + note.quote.length;
    const first = nodes.find(({ node, start: at }) => at <= start && start < at + node.length);
    const last = nodes.find(({ node, start: at }) => at < end && end <= at + node.length);
    if (!first || !last) return [];
    const range = document.createRange();
    range.setStart(first.node, start - first.start);
    range.setEnd(last.node, end - last.start);
    return range.getClientRects().length ? [{ note, range }] : [];
  });
}

function edit(note: Annotation): Editor {
  return { id: note.id, quote: note.quote, offset: note.text_offset, body: note.body };
}

export function ActivityAnnotations({ children, chapter, activity, notes, selectedNote }: {
  children: ReactNode; chapter: string; activity: string; notes: Annotation[]; selectedNote?: string;
}) {
  const router = useRouter();
  const content = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [selection, setSelection] = useState<Anchor | null>(null);
  const [menu, setMenu] = useState<(Anchor & { x: number; y: number }) | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [markers, setMarkers] = useState<{ note: Annotation; top: number }[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onSelection = () => setSelection(content.current ? readAnchor(content.current) : null);
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, []);

  useEffect(() => {
    const root = content.current;
    if (!root || !notes.length) { setMarkers([]); return; }
    const update = () => {
      const matches = locate(root, notes);
      const top = root.getBoundingClientRect().top;
      // Stack neighbouring icons to keep each saved note independently clickable.
      let previous = -28;
      setMarkers(matches.map(({ note, range }) => ({ note, top: range.getClientRects()[0].top - top }))
        .sort((a, b) => a.top - b.top)
        .map((item) => ({ ...item, top: previous = Math.max(item.top, previous + 28) })));
      if (typeof Highlight !== "undefined" && CSS.highlights) {
        CSS.highlights.set("ilearn-notes", new Highlight(...matches.map(({ range }) => range)));
      }
    };
    const observer = new ResizeObserver(update);
    observer.observe(root);
    window.addEventListener("resize", update);
    update();
    return () => { observer.disconnect(); window.removeEventListener("resize", update); CSS.highlights?.delete("ilearn-notes"); };
  }, [notes, children]);

  useEffect(() => {
    const note = notes.find((item) => item.id === selectedNote);
    if (note) { setError(""); setEditor(edit(note)); }
    // Open the requested note on navigation, not after every save.
  }, [selectedNote, activity]);

  useEffect(() => {
    if (editor && !dialog.current?.open) dialog.current?.showModal();
  }, [editor]);

  function begin(anchor: Anchor) {
    setMenu(null);
    setError("");
    setMessage("");
    setEditor({ quote: anchor.quote, offset: anchor.offset, body: "" });
    window.getSelection()?.removeAllRanges();
  }

  function closeEditor() {
    setEditor(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has("note")) {
      url.searchParams.delete("note");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || pending) return;
    const body = String(new FormData(event.currentTarget).get("body") ?? "");
    setError("");
    startTransition(async () => {
      try {
        const result = await saveAnnotation(chapter, activity, { ...editor, body });
        if (result.error) setError(result.error);
        else { closeEditor(); setMessage("Note saved."); }
      } catch {
        setError("Your note could not be saved. Try again.");
      }
    });
  }

  return <div id="annotated-activity" className="space-y-3">
    <p className="text-sm">Select text to add a private note.</p>
    <div className="annotation-reader">
      <div ref={content} className="space-y-5" onContextMenu={(event) => {
        const anchor = content.current && readAnchor(content.current);
        if (!anchor) return;
        event.preventDefault();
        setMenu({ ...anchor, x: Math.max(8, Math.min(event.clientX, window.innerWidth - 145)),
          y: Math.max(8, Math.min(event.clientY, window.innerHeight - 55)) });
      }}>{children}</div>
      {markers.map(({ note, top }) => <button key={note.id} type="button" style={{ top }}
        className="annotation-marker" aria-label={`Edit note on ${note.quote.slice(0, 75)}`}
        title="Edit saved note" onClick={() => { setError(""); setEditor(edit(note)); }}>
        <span aria-hidden="true">✎</span>
      </button>)}
    </div>
    {menu ? <button autoFocus type="button" className="button button-secondary annotation-menu"
      style={{ top: menu.y, left: menu.x }} onBlur={() => setMenu(null)}
      onKeyDown={(event) => { if (event.key === "Escape") setMenu(null); }}
      onClick={() => begin(menu)}>Add note</button>
      : selection && !editor && <button type="button" className="button annotation-selection"
        onPointerDown={(event) => event.preventDefault()} onClick={() => begin(selection)}>Add note to selection</button>}
    {editor && <dialog ref={dialog} className="annotation-dialog" aria-labelledby="note-dialog-title"
      onCancel={(event) => { event.preventDefault(); if (!pending) closeEditor(); }}>
      <form onSubmit={submit} className="space-y-4" key={editor.id ?? "new"}>
        <h2 id="note-dialog-title">{editor.id ? "Edit note" : "Add note"}</h2>
        <blockquote className="max-h-32 overflow-auto border-l-2 border-[var(--accent)] pl-3 text-sm">{editor.quote}</blockquote>
        <label className="block font-semibold">Your private note
          <textarea autoFocus name="body" required rows={4} maxLength={2000} defaultValue={editor.body}
            className="mt-1 block w-full rounded-lg border border-[var(--border)] p-3 font-normal" />
        </label>
        {error && <p role="alert" className="form-error">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="button" disabled={pending}>{pending ? "Saving…" : "Save note"}</button>
          <button type="button" className="button button-secondary" disabled={pending} onClick={closeEditor}>Cancel</button>
        </div>
      </form>
    </dialog>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>;
}
