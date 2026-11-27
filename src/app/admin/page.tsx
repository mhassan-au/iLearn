// Administrator-only draft import and publishing controls.
import { notFound } from "next/navigation";
import { learningClient } from "../../lib/learning";
import { ImportForm } from "./import-form";
import { setContentStatus } from "./actions";

type Item = { kind: string; id: string; parent_id: string | null; title: string; status: string };
const kindOrder = ["topic", "module", "chapter", "activity"];

function ContentItem({ item, items }: { item: Item; items: Item[] }) {
  const children = items.filter((row) => row.parent_id === item.id && kindOrder.indexOf(row.kind) === kindOrder.indexOf(item.kind) + 1);
  return <li className="space-y-2 rounded-lg border border-[var(--border)] p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><strong>{item.title}</strong><p className="text-sm">{item.kind} · {item.status} · {item.id}</p></div>
      <form action={setContentStatus.bind(null, item.kind, item.id)} className="flex flex-wrap gap-2">
        {item.status !== "published" && <button className="button" name="status" value="published">{item.kind === "topic" ? "Publish topic and drafts" : "Publish"}</button>}
        {item.status === "published" && <button className="button" name="status" value="draft">Unpublish</button>}
        {item.status !== "archived" && <button className="rounded-lg border border-[var(--border)] px-3" name="status" value="archived">Archive</button>}
      </form>
    </div>
    {!!children.length && <details>
      <summary className="cursor-pointer">Show {children.length} items</summary>
      <ul className="mt-2 space-y-2">{children.map((child) => <ContentItem key={child.id} item={child} items={items} />)}</ul>
    </details>}
  </li>;
}

export default async function Admin({ searchParams }: { searchParams: Promise<{ failed?: string; updated?: string }> }) {
  const client = await learningClient();
  const { data: profile } = await client.from("profiles").select("role").maybeSingle();
  if (profile?.role !== "administrator") notFound();
  const [inventory, query] = await Promise.all([client.rpc("admin_content_inventory"), searchParams]);
  const items: Item[] = Array.isArray(inventory.data) ? inventory.data : [];
  return <div className="space-y-8">
    <h1>Content admin</h1>
    <section className="panel space-y-4">
      <h2>Import a topic</h2>
      <p>Use stable IDs to edit existing items and order numbers to rearrange them. Saving an import puts the supplied items in draft.</p>
      <ImportForm />
    </section>
    <section className="space-y-3">
      <h2>Manage content</h2>
      {query.failed && <p role="alert">The status could not be updated.</p>}
      {query.updated && <p role="status">Content status updated.</p>}
      {inventory.error ? <p role="alert">Content could not be loaded.</p> :
        <ul className="space-y-3">{items.filter((item) => item.kind === "topic").map((item) => <ContentItem key={item.id} item={item} items={items} />)}</ul>}
    </section>
  </div>;
}
