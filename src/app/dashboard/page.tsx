// Learner dashboard with one primary next step and a compact topic list.
import Link from "next/link";
import { learningClient } from "../../lib/learning";
import { learningPercent, NextActivity, type LearningSummary } from "../components/next-activity";
import { signOut } from "../sign-in/actions";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const client = await learningClient();
  const [{ data, error }, profile] = await Promise.all([
    client.rpc("learning_resume"),
    client.from("profiles").select("role").maybeSingle(),
  ]);
  const topics: LearningSummary[] = Array.isArray(data) ? data : [];
  const unfinished = topics.filter((topic) => topic.activity_count > topic.completed_count);
  const current = unfinished.reduce<LearningSummary | undefined>((latest, topic) => {
    if (!latest || (topic.last_accessed ?? "") > (latest.last_accessed ?? "")) return topic;
    return latest;
  }, undefined);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1>My learning</h1>
        <div className="flex flex-wrap items-center gap-4">
          {profile.data?.role === "administrator" && <Link href="/admin">Content admin</Link>}
          <form action={signOut}><button className="button" type="submit">Sign out</button></form>
        </div>
      </div>
      {error ? <p role="alert">Learning progress could not be loaded. Please try again.</p> :
        current ? <section className="panel space-y-4" aria-labelledby="current-topic">
          <h2 id="current-topic">{current.topic_title}</h2>
          <p><strong>{learningPercent(current)}% complete</strong> · {current.completed_count} of {current.activity_count} activities</p>
          <NextActivity summary={current} />
          <Link href={`/topics/${current.topic_slug}`}>View modules</Link>
        </section> : <p>{topics.some((topic) => topic.activity_count > 0)
          ? "You’re up to date. All available activities are complete."
          : "No learning activities are published yet."}</p>}
      {!error && topics.some((topic) => topic.topic_id !== current?.topic_id) &&
        <section className="space-y-3" aria-labelledby="other-topics">
          <h2 id="other-topics">{current ? "Other topics" : "Topics"}</h2>
          <ul className="space-y-2">
            {topics.filter((topic) => topic.topic_id !== current?.topic_id).map((topic) => (
              <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-4" key={topic.topic_id}>
                <Link href={`/topics/${topic.topic_slug}`}>{topic.topic_title}</Link>
                <span>{topic.activity_count ? `${learningPercent(topic)}% complete` : "No activities yet"}</span>
              </li>
            ))}
          </ul>
        </section>}
    </div>
  );
}
