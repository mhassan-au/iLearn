// Catalogue of topics visible to the current learner.
import Link from "next/link";
import { learningClient } from "../../lib/learning";

export default async function Topics() {
  const client = await learningClient();
  const { data, error } = await client.from("topics")
    .select("slug,title,description,difficulty,estimated_minutes,modules(count)").order("sort_order");
  return (
    <section className="space-y-6">
      <h1>Topics</h1>
      {error && <p role="alert">Topics could not be loaded. Please try again.</p>}
      {data?.length === 0 && <p>No published topics are available yet.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((topic) => (
          <article className="panel space-y-3" key={topic.slug}>
            <h2><Link href={`/topics/${topic.slug}`}>{topic.title}</Link></h2>
            <p>{topic.description}</p>
            <p className="capitalize">{topic.difficulty} · {topic.modules[0]?.count ?? 0} modules · {topic.estimated_minutes} min</p>
            <p>Access included</p>
          </article>
        ))}
      </div>
    </section>
  );
}
