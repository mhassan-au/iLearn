// Keep the next activity and its location together on learner overview pages.
import Link from "next/link";

export type LearningSummary = {
  topic_id: string;
  topic_slug: string;
  topic_title: string;
  completed_count: number;
  activity_count: number;
  last_accessed: string | null;
  module_title: string | null;
  chapter_id: string | null;
  chapter_title: string | null;
  activity_id: string | null;
  activity_title: string | null;
  activity_type: string | null;
};

export function learningPercent(summary: LearningSummary) {
  return summary.activity_count > 0
    ? Math.floor(100 * summary.completed_count / summary.activity_count)
    : 0;
}

export function NextActivity({ summary }: { summary: LearningSummary }) {
  if (!summary.activity_id || !summary.chapter_id) {
    return <p>{summary.activity_count === 0 ? "No activities published yet."
      : summary.completed_count === summary.activity_count ? "Topic complete."
        : "No activity is available to continue right now."}</p>;
  }
  const isLesson = summary.activity_type === "lesson";
  const chapterUrl = `/learn/${encodeURIComponent(summary.chapter_id)}?activity=${encodeURIComponent(summary.activity_id)}`;
  return (
    <div className="space-y-2">
      <p>Up next: <strong>{summary.activity_title}</strong></p>
      <p className="text-sm">{summary.module_title} · {summary.chapter_title}</p>
      {isLesson ? <Link className="button" href={chapterUrl}>
        {summary.last_accessed || summary.completed_count > 0 ? "Continue learning" : "Start learning"}
      </Link> : <p className="text-sm">{summary.activity_type?.endsWith("Quiz")
        ? "Quiz delivery is coming in the next milestone."
        : "This lab is not available yet."}</p>}
    </div>
  );
}
