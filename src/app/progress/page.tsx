// Review personal progress and revisit completed work.
import Link from "next/link";
import { learningClient } from "../../lib/learning";
import { learningPercent, type LearningSummary } from "../components/next-activity";

type HistoryEntry = {
  activity_id: string; chapter_id: string; title: string; type: string;
  happened_at: string; attempt_id: string | null; score: number | null; passed: boolean | null;
};
const date = new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: "Australia/Sydney" });

function History({ heading, items, empty }: { heading: string; items: HistoryEntry[]; empty: string }) {
  return <section className="space-y-3">
    <h2>{heading}</h2>
    {items.length ? <ul className="divide-y divide-[var(--border)]">
      {items.map((item) => (
        <li className="flex flex-wrap justify-between gap-2 py-3" key={item.attempt_id ?? item.activity_id}>
          <Link href={`/learn/${encodeURIComponent(item.chapter_id)}?activity=${encodeURIComponent(item.activity_id)}${item.attempt_id ? `&attempt=${encodeURIComponent(item.attempt_id)}` : ""}`}>{item.title}</Link>
          <p>{item.attempt_id && <>{item.score}%{item.type === "finalQuiz" ? (item.passed ? " · Passed" : " · Not passed") : ""} · </>}
            <time dateTime={item.happened_at}>{date.format(new Date(item.happened_at))}</time>
          </p>
        </li>
      ))}
    </ul> : <p>{empty}</p>}
  </section>;
}

export default async function Progress() {
  const client = await learningClient();
  const [summary, history] = await Promise.all([client.rpc("learning_resume"), client.rpc("personal_learning_history")]);
  const topics: LearningSummary[] = Array.isArray(summary.data) ? summary.data : [];
  const entries: HistoryEntry[] = Array.isArray(history.data) ? history.data : [];
  return <div className="space-y-8">
    <h1>My progress</h1>
    <section className="space-y-3">
      <h2>Topics</h2>
      {summary.error ? <p role="alert">Topic progress could not be loaded.</p> :
        !topics.length ? <p>No published topics yet.</p> : <ul className="space-y-3">
          {topics.map((topic) => <li className="rounded-xl border border-[var(--border)] p-4" key={topic.topic_id}>
            <Link href={`/topics/${encodeURIComponent(topic.topic_slug)}`}>{topic.topic_title}</Link>
            <p>{learningPercent(topic)}% complete · {topic.completed_count} of {topic.activity_count} activities</p>
          </li>)}
        </ul>}
    </section>
    {history.error ? <p role="alert">Activity history could not be loaded.</p> : <>
      <History heading="Completed labs" items={entries.filter((item) => item.type.endsWith("Lab") && !item.attempt_id)} empty="No completed labs yet." />
      <History heading="Recent quiz results" items={entries.filter((item) => item.attempt_id)} empty="No quiz attempts yet." />
      <History heading="Recently completed" items={entries.filter((item) => !item.attempt_id && item.type === "lesson")} empty="No completed lessons yet." />
    </>}
  </div>;
}
