// Protected dashboard shell with the published sample topic.
import { redirect } from "next/navigation";
import Link from "next/link";
import { requestClient } from "../../lib/supabase";
import { signOut } from "../sign-in/actions";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const client = await requestClient();
  if (!client) redirect("/sign-in");
  const { data: session } = await client.auth.getClaims();
  if (!session?.claims.sub) redirect("/sign-in");
  const { data: topics, error } = await client
    .from("topics").select("id,slug,title,description,estimated_minutes").order("sort_order");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1>My learning</h1>
        <form action={signOut}><button className="button" type="submit">Sign out</button></form>
      </div>
      <section className="space-y-4" aria-labelledby="available-topics">
        <h2 id="available-topics">Available topics</h2>
        {error ? <p role="alert">Topics could not be loaded. Please try again.</p> :
          !topics?.length ? <p>No published topics are available yet.</p> :
          topics.map((topic) => (
            <article className="panel space-y-3" key={topic.id}>
              <h3 className="text-xl font-semibold"><Link href={`/topics/${topic.slug}`}>{topic.title}</Link></h3>
              <p>{topic.description}</p>
              <p>{topic.estimated_minutes} minutes</p>
            </article>
          ))}
      </section>
    </div>
  );
}
