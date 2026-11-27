// Topic overview and ordered module list.
import Link from "next/link";
import { notFound } from "next/navigation";
import { learningClient } from "../../../lib/learning";

export default async function Topic({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const client = await learningClient();
  const result = await client.from("topics").select("id,title,description,objectives").eq("slug", topic).maybeSingle();
  if (result.error) throw new Error("Could not load topic");
  if (!result.data) notFound();
  const { data: modules, error } = await client.from("modules")
    .select("slug,title,description,estimated_minutes").eq("topic_id", result.data.id).order("sort_order");
  if (error) throw new Error("Could not load modules");

  return (
    <section className="space-y-6">
      <Link href="/topics">All topics</Link>
      <h1>{result.data.title}</h1>
      <p>{result.data.description}</p>
      {!!result.data.objectives.length && <ul className="list-disc pl-6">{result.data.objectives.map((item: string) => <li key={item}>{item}</li>)}</ul>}
      <h2>Modules</h2>
      {!modules.length && <p>No modules are published yet.</p>}
      <ol className="space-y-4">
        {modules.map((module) => (
          <li className="panel space-y-2" key={module.slug}>
            <h3 className="text-xl font-semibold"><Link href={`/topics/${topic}/${module.slug}`}>{module.title}</Link></h3>
            <p>{module.description} · {module.estimated_minutes} min</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
