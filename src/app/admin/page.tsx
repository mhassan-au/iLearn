// Administrator-only draft import and publishing controls.
import { notFound } from "next/navigation";
import { learningClient } from "../../lib/learning";
import { ImportForm } from "./import-form";
import { grantContentAccess, revokeContentAccess, setContentAccess, setContentStatus } from "./actions";

type Item = { kind: string; id: string; parent_id: string | null; title: string; status: string };
type Grant = { id: string; user_id: string; resource_id: string; resource_kind: string; expires_at: string | null };
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
    {item.kind !== "chapter" && <form action={setContentAccess.bind(null, item.kind, item.id)} className="flex flex-wrap items-center gap-2">
      <label className="text-sm">Access <select name="level" defaultValue="" required className="rounded border border-[var(--border)] p-1">
        <option value="" disabled>Select level</option>
        <option value="free">Free</option><option value="preview">Preview</option><option value="restricted">Restricted</option>
      </select></label>
      <button className="rounded border border-[var(--border)] px-2 py-1 text-sm">Set access</button>
    </form>}
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
  const [inventory, access, query] = await Promise.all([
    client.rpc("admin_content_inventory"), client.rpc("admin_list_access"), searchParams,
  ]);
  const items: Item[] = Array.isArray(inventory.data) ? inventory.data : [];
  const grants: Grant[] = Array.isArray(access.data) ? access.data : [];
  return <div className="space-y-8">
    <h1>Content admin</h1>
    <section className="panel space-y-4">
      <h2>Import a topic</h2>
      <p>Use stable IDs to edit existing items and order numbers to rearrange them. Saving an import puts the supplied items in draft.</p>
      <ImportForm />
    </section>
    <section className="space-y-3">
      <h2>Manage content</h2>
      {query.failed && <p role="alert">The update could not be saved. Check the selected item and learner ID.</p>}
      {query.updated && <p role="status">Update saved.</p>}
      {inventory.error ? <p role="alert">Content could not be loaded.</p> :
        <ul className="space-y-3">{items.filter((item) => item.kind === "topic").map((item) => <ContentItem key={item.id} item={item} items={items} />)}</ul>}
    </section>
    <section className="panel space-y-4">
      <h2>Grant learner access</h2>
      <form action={grantContentAccess} className="space-y-3">
        <label className="block">Learner’s Supabase user ID<input name="learner" required maxLength={36} /></label>
        <label className="block">Resource
          <select name="resource" required defaultValue="" className="mt-1 block w-full rounded border border-[var(--border)] p-2">
            <option value="" disabled>Choose a resource</option>
            {items.filter((item) => item.kind !== "chapter").map((item) => (
              <option key={`${item.kind}:${item.id}`} value={`${item.kind}:${item.id}`}>{item.title} ({item.kind})</option>
            ))}
          </select>
        </label>
        <label className="block">Days until expiry (optional)<input name="days" type="number" min={1} max={3650} /></label>
        <button className="button">Grant access</button>
      </form>
      {access.error && <p>Access records could not be loaded.</p>}
      {!!grants.length && <ul className="space-y-3">{grants.map((grant) => <li key={grant.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
        <p className="break-all">{grant.resource_kind} · {grant.resource_id} · {grant.user_id}
          {grant.expires_at ? ` · expires ${grant.expires_at.slice(0, 10)} UTC` : ""}</p>
        <form action={revokeContentAccess.bind(null, grant.id)}><button className="button">Revoke</button></form>
      </li>)}</ul>}
    </section>
  </div>;
}
