// Topic overview and ordered module list.
import Link from "next/link";
import { notFound } from "next/navigation";
import { learningClient } from "../../../lib/learning";
import { ChapterList } from "../components/chapter-list";

const accessDate = new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeZone: "Australia/Sydney" });
type ModuleProgress = { module_id: string; percent: number; last_accessed: string | null };

export default async function Topic({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const client = await learningClient();
  const result = await client.from("topics").select("id,title,description,objectives").eq("slug", topic).maybeSingle();
  if (result.error) throw new Error("Could not load topic");
  if (!result.data) notFound();
  const [moduleList, progress] = await Promise.all([
    client.from("modules").select("id,title,description,estimated_minutes").eq("topic_id", result.data.id).order("sort_order"),
    client.rpc("topic_module_progress", { target_topic: result.data.id }),
  ]);
  if (moduleList.error) throw new Error("Could not load modules");
  const modules = moduleList.data;
  const progressByModule = new Map<string, ModuleProgress>(
    (progress.data ?? []).map((row: ModuleProgress) => [row.module_id, row]),
  );

  return (
    <section className="space-y-6">
      <Link href="/topics">All topics</Link>
      <h1>{result.data.title}</h1>
      <p>{result.data.description}</p>
      {!!result.data.objectives.length && <ul className="list-disc pl-6">{result.data.objectives.map((item: string) => <li key={item}>{item}</li>)}</ul>}
      <h2>Modules</h2>
      {!modules.length && <p>No modules are published yet.</p>}
      <ol className="space-y-4">
        {modules.map((module, index) => {
          const summary = progressByModule.get(module.id);
          return (
              <li className="rounded-xl border border-[var(--border)] bg-[var(--surface)]" key={module.id}>
                <details open={index === 0}>
                  <summary className="cursor-pointer rounded-xl p-4 text-lg font-semibold">
                    {module.title}
                    {summary ? (
                      <span className="ml-4 mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm font-normal">
                        <span>{summary.percent}% complete</span>
                        <span>Last accessed: {summary.last_accessed
                          ? <time dateTime={summary.last_accessed}>{accessDate.format(new Date(summary.last_accessed))}</time>
                          : "Not yet accessed"}</span>
                      </span>
                    ) : <span className="ml-4 block text-sm font-normal">Progress and access history unavailable</span>}
                  </summary>
                  <div className="space-y-4 px-4 pb-4">
                    <p>{module.description} · {module.estimated_minutes} min</p>
                    <h3 className="font-semibold">Chapters</h3>
                    <ChapterList client={client} moduleId={module.id} />
                  </div>
                </details>
              </li>
          );
        })}
      </ol>
    </section>
  );
}
