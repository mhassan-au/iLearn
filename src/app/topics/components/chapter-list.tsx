// Shared learner chapter rows for topic and module overviews.
import Link from "next/link";
import type { learningClient } from "../../../lib/learning";

type ChapterActivity = { id: string; type: string; completed: boolean; unlocked: boolean };

export async function ChapterList({ client, moduleId }: {
  client: Awaited<ReturnType<typeof learningClient>>;
  moduleId: string;
}) {
  const { data: chapters, error } = await client.from("chapters")
    .select("id,title,description,estimated_minutes").eq("module_id", moduleId).order("sort_order");
  if (error) throw new Error("Could not load chapters");

  // Use the same learner-scoped outline as the chapter reader for both controls.
  const chapterRows = await Promise.all(chapters.map(async (chapter) => {
    const outline = await client.rpc("chapter_outline", { target_chapter: chapter.id });
    const activities: ChapterActivity[] = outline.data ?? [];
    const completed = activities.filter((activity) => activity.completed).length;
    const percent = activities.length ? Math.floor(completed * 100 / activities.length) : 0;
    return {
      chapter, completed, percent, total: activities.length,
      quiz: activities.find((activity) => activity.type === "finalQuiz"),
      unavailable: !!outline.error,
    };
  }));

  return (
    <>
      {!chapters.length && <p>No chapters are published yet.</p>}
      <ol className="space-y-4">
        {chapterRows.map(({ chapter, completed, percent, total, quiz, unavailable }) => {
          const chapterUrl = `/learn/${encodeURIComponent(chapter.id)}`;
          return (
            <li className="rounded-xl border border-[var(--border)] p-4 flex flex-wrap items-center justify-between gap-5" key={chapter.id}>
              <div className="min-w-0 flex-1 basis-60 space-y-2">
                <p className="font-semibold"><Link href={chapterUrl}>{chapter.title}</Link></p>
                <p>{chapter.description} · {chapter.estimated_minutes} min</p>
                {unavailable ? <p>Progress is temporarily unavailable.</p> : (
                  <div className="max-w-xs space-y-1">
                    <p className="text-sm"><strong>{percent}% complete</strong>{total > 0 && ` · ${completed} of ${total} activities`}</p>
                    <progress className="block w-full" value={percent} max={100} aria-label={`${chapter.title} progress`} />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                {quiz?.unlocked ? (
                  <Link className="button" href={`${chapterUrl}?activity=${encodeURIComponent(quiz.id)}`}
                    aria-label={`Take quiz for ${chapter.title}`}>Take quiz</Link>
                ) : (
                  <>
                    <button className="button cursor-not-allowed opacity-60" type="button" disabled>Take quiz</button>
                    <p className="text-sm">{unavailable ? "Quiz status unavailable" : quiz ? "Complete earlier activities to unlock" : "No chapter quiz published"}</p>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
