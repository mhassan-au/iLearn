// Module overview and its published chapters.
import Link from "next/link";
import { notFound } from "next/navigation";
import { learningClient } from "../../../../lib/learning";

import { ChapterList } from "../../components/chapter-list";

export default async function Module({ params }: { params: Promise<{ topic: string; module: string }> }) {
  const { topic, module } = await params;
  const client = await learningClient();
  const result = await client.from("modules")
    .select("id,title,description,objectives,estimated_minutes,topics!inner(slug)")
    .eq("slug", module).eq("topics.slug", topic).maybeSingle();
  if (result.error) throw new Error("Could not load module");
  if (!result.data) notFound();

  return (
    <section className="space-y-6">
      <Link href={`/topics/${topic}`}>Back to topic</Link>
      <h1>{result.data.title}</h1>
      <p>{result.data.description} · {result.data.estimated_minutes} min</p>
      {!!result.data.objectives.length && <ul className="list-disc pl-6">{result.data.objectives.map((item: string) => <li key={item}>{item}</li>)}</ul>}
      <h2>Chapters</h2>
      <ChapterList client={client} moduleId={result.data.id} />
    </section>
  );
}
