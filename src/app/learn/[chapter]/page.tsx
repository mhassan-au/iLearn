// Accessible chapter outline, lesson reader, and sequential navigation.
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { learningClient } from "../../../lib/learning";
import { completeLesson } from "../actions";
import { ActivityVisit } from "../activity-visit";
import { Quiz } from "../quiz";
import { Lab } from "../lab";
import { ActionButton } from "../../components/action-button";
import { Toast } from "../../components/toast";

type Activity = {
  id: string; title: string; type: string; description: string;
  estimated_minutes: number; completed: boolean; unlocked: boolean;
};

export default async function Learn({ params, searchParams }: {
  params: Promise<{ chapter: string }>;
  searchParams: Promise<{ activity?: string; error?: string; attempt?: string; solution?: string; saved?: string; notice?: string }>;
}) {
  const [{ chapter }, query] = await Promise.all([params, searchParams]);
  const client = await learningClient();
  const [info, outline] = await Promise.all([
    client.from("chapters").select("id,title,description,passing_score").eq("id", chapter).maybeSingle(),
    client.rpc("chapter_outline", { target_chapter: chapter }),
  ]);
  if (info.error || outline.error) throw new Error("Could not load chapter");
  if (!info.data) notFound();

  const activities: Activity[] = outline.data ?? [];
  const open = activities.filter((item) => item.unlocked);
  const itemsDone = activities.filter((item) => item.completed).length;
  const current = query.activity
    ? activities.find((item) => item.id === query.activity)
    : open.find((item) => !item.completed) ?? open.at(-1) ?? activities[0];
  if (query.activity && !current) notFound();

  let lesson: { markdown?: string; objectives?: string[]; takeaways?: string[] } | null = null;
  if (current?.unlocked && current.type === "lesson") {
    const { data, error } = await client.rpc("read_lesson", {
      target_chapter: chapter, target_activity: current.id,
    });
    if (error) throw new Error("Could not load lesson");
    lesson = data;
  }

  const index = activities.findIndex((item) => item.id === current?.id);
  const previous = index > 0 ? activities[index - 1] : undefined;
  const next = index >= 0 ? activities[index + 1] : undefined;
  const activityUrl = (id: string) => `/learn/${encodeURIComponent(chapter)}?activity=${encodeURIComponent(id)}`;

  return (
    <div className="space-y-6">
      {query.notice === "lesson-complete" && <Toast message="Lesson complete. Your progress is saved." />}
      {query.error === "completion" && <Toast tone="error" message="Your lesson completion couldn’t be saved." />}
      <Link href="/topics">All topics</Link>
      {current?.unlocked && <ActivityVisit chapter={chapter} activity={current.id} />}
      <header className="space-y-3">
        <h1>{info.data.title}</h1>
        <p>{info.data.description}</p>
        {!!activities.length && <label className="block">
          {itemsDone} of {activities.length} activities complete
          <progress className="block w-full max-w-sm" max={activities.length} value={itemsDone} />
        </label>}
      </header>
      <div className="grid items-start gap-5 md:grid-cols-[minmax(13rem,1fr)_minmax(0,3fr)]">
        <details open className="panel">
          <summary className="cursor-pointer font-semibold">Chapter activities</summary>
          <ol className="mt-4 list-decimal space-y-3 pl-5">
            {activities.map((item) => <li key={item.id}>
              {item.unlocked ? <Link aria-current={item.id === current?.id ? "step" : undefined} href={activityUrl(item.id)}>{item.title}</Link> : item.title}
              <small className="block">{item.completed ? "Complete" : item.unlocked ? `${item.estimated_minutes} min` : "Locked"}</small>
            </li>)}
          </ol>
        </details>
        <article className="panel min-w-0 space-y-5">
          {!current ? <p>No activities are available yet.</p> : <>
            <h2>{current.title}</h2>
            <p>{current.description}</p>
            {query.error === "completion" && <p role="alert">Completion could not be saved. Please try again.</p>}
            {!current.unlocked ? <p>Complete the earlier modules and required activities to unlock this one.</p>
              : current.type === "shortQuiz" || current.type === "finalQuiz" ? (
                <Quiz client={client} chapter={chapter} activity={current.id} formal={current.type === "finalQuiz"}
                  passingScore={info.data.passing_score} attempt={query.attempt} errorCode={query.error} justSubmitted={query.notice === "quiz-submitted"} />
              ) : current.type === "guidedLab" || current.type === "independentLab" ? (
                <Lab client={client} chapter={chapter} activity={current.id} guided={current.type === "guidedLab"}
                  completed={current.completed} reveal={query.solution === "show"} saved={query.saved} errorCode={query.error} />
              )
              : lesson ? <>
                {!!lesson.objectives?.length && <section><h3 className="font-semibold">Learning objectives</h3>
                  <ul className="list-disc pl-6">{lesson.objectives.map((item) => <li key={item}>{item}</li>)}</ul></section>}
                <div className="lesson-body">
                  <Markdown skipHtml remarkPlugins={[remarkGfm]}>{lesson.markdown ?? ""}</Markdown>
                </div>
                {!!lesson.takeaways?.length && <section><h3 className="font-semibold">Key takeaways</h3>
                  <ul className="list-disc pl-6">{lesson.takeaways.map((item) => <li key={item}>{item}</li>)}</ul></section>}
                {current.completed ? <p>Lesson complete</p> :
                  <form action={completeLesson.bind(null, chapter, current.id)}><ActionButton pendingLabel="Saving progress…">Mark complete</ActionButton></form>}
              </> : <p>The lesson is currently unavailable.</p>}
            <nav className="flex flex-wrap gap-5" aria-label="Activity navigation">
              {previous?.unlocked && <Link href={activityUrl(previous.id)}>Previous</Link>}
              {next?.unlocked && <Link href={activityUrl(next.id)}>Next</Link>}
            </nav>
          </>}
        </article>
      </div>
    </div>
  );
}
