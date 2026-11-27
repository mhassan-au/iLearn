// Topic overview and ordered module list.
import Link from "next/link";
import { notFound } from "next/navigation";
import { learningClient } from "../../../lib/learning";
import { ChapterList } from "../components/chapter-list";

export default async function Topic({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const client = await learningClient();
  const result = await client.from("topics").select("id,title,description,objectives").eq("slug", topic).maybeSingle();
  if (result.error) throw new Error("Could not load topic");
  if (!result.data) notFound();
  const { data: modules, error } = await client.from("modules")
    .select("id,title,description,estimated_minutes").eq("topic_id", result.data.id).order("sort_order");
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
          <li className="panel space-y-4" key={module.id}>
            <h3 className="text-xl font-semibold">{module.title}</h3>
            <p>{module.description} · {module.estimated_minutes} min</p>
            <h4 className="font-semibold">Chapters</h4>
            <ChapterList client={client} moduleId={module.id} />
          </li>
        ))}
      </ol>
    </section>
  );
}
