// Topic overview and ordered module list.
import Link from "next/link";
import { notFound } from "next/navigation";
import { learningClient } from "../../../lib/learning";
import { ChapterList } from "../components/chapter-list";

const accessDate = new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeZone: "Australia/Sydney" });
type ModuleProgress = {
  module_id: string; percent: number; last_accessed: string | null;
  completed_count: number; activity_count: number; completed_at: string | null; unlocked: boolean;
};

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
  const summaries: ModuleProgress[] = progress.data ?? [];
  const progressByModule = new Map(summaries.map((row) => [row.module_id, row]));
  const counts = summaries.reduce((sum, row) => ({
    completed: sum.completed + row.completed_count, total: sum.total + row.activity_count,
  }), { completed: 0, total: 0 });
  const topicPercent = counts.total ? Math.floor(100 * counts.completed / counts.total) : 0;
  const latest = summaries.filter((row) => row.completed_at)
    .sort((a, b) => Date.parse(b.completed_at!) - Date.parse(a.completed_at!))[0];
  const lastModule = modules.find((module) => module.id === latest?.module_id);
  const currentModule = modules.find((module) => {
    const state = progressByModule.get(module.id);
    return state?.unlocked && !state.completed_at;
  });

  return (
    <section className="space-y-6">
      <Link href="/topics">All topics</Link>
      <h1>{result.data.title}</h1>
      <p>{result.data.description}</p>
      {!!result.data.objectives.length && <ul className="list-disc pl-6">{result.data.objectives.map((item: string) => <li key={item}>{item}</li>)}</ul>}
      <section className="panel space-y-3" aria-label="Topic progress">
        <h2>Topic progress</h2>
        {progress.error ? <p>Progress is temporarily unavailable.</p> : <>
          <p><strong>{topicPercent}% complete</strong> · {counts.completed} of {counts.total} activities</p>
          <progress className="learning-progress" max={100} value={topicPercent} aria-label="Overall topic progress" />
          <p>Last completed module: {lastModule?.title ?? "None yet"}</p>
        </>}
      </section>
      <h2>Modules</h2>
      {!modules.length && <p>No modules are published yet.</p>}
      <ol className="space-y-4">
        {modules.map((module) => {
          const summary = progressByModule.get(module.id);
          return (
              <li className="rounded-xl border border-[var(--border)] bg-[var(--surface)]" key={module.id}>
                <details open={currentModule?.id === module.id}>
                  <summary className="cursor-pointer rounded-xl p-4 text-lg font-semibold">
                    {module.title}
                    {summary ? (
                      <span className="mt-2 block space-y-2 text-sm font-normal">
                        <span className="flex flex-wrap gap-x-4 gap-y-1">
                          <span>{summary.percent}% complete</span>
                          <span>Last accessed: {summary.last_accessed
                            ? <time dateTime={summary.last_accessed}>{accessDate.format(new Date(summary.last_accessed))}</time>
                            : "Not yet accessed"}</span>
                          {!summary.unlocked && <strong>Locked</strong>}
                        </span>
                        <progress className="learning-progress" max={100} value={summary.percent} aria-label={`${module.title} progress`} />
                      </span>
                    ) : <span className="ml-4 block text-sm font-normal">Progress and access history unavailable</span>}
                  </summary>
                  <div className="space-y-4 px-4 pb-4">
                    <p>{module.description} · {module.estimated_minutes} min</p>
                    {summary?.unlocked ? <>
                      <h3 className="font-semibold">Chapters</h3>
                      <ChapterList client={client} moduleId={module.id} />
                    </> : <p>{summary ? "Complete the earlier modules to unlock these chapters." : "Module access is temporarily unavailable."}</p>}
                  </div>
                </details>
              </li>
          );
        })}
      </ol>
    </section>
  );
}
