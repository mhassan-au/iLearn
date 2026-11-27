// Render learner-safe questions and retrieve feedback only for owned submissions.
import { randomUUID } from "node:crypto";
import Link from "next/link";
import type { learningClient } from "../../lib/learning";
import { submitQuiz } from "./quiz-actions";
import { QuizForm } from "./quiz-form";

type Option = { id: string; label: string };
type Question = {
  id: string; question: string; question_type: string; options: Option[];
  hint: string | null; points: number;
};
type Review = {
  question: string; options: Option[]; selected: string[]; correct_options: string[];
  correct: boolean; explanation: string;
};

const accessDate = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Australia/Sydney",
});
const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function Quiz({ client, chapter, activity, formal, passingScore, attempt, errorCode }: {
  client: Awaited<ReturnType<typeof learningClient>>;
  chapter: string; activity: string; formal: boolean; passingScore: number;
  attempt?: string; errorCode?: string;
}) {
  const path = `/learn/${encodeURIComponent(chapter)}?activity=${encodeURIComponent(activity)}`;
  const history = await client.from("quiz_attempts").select("id,score,passed,submitted_at")
    .eq("activity_id", activity).order("submitted_at", { ascending: false }).limit(20);

  let body;
  if (attempt) {
    const result = uuidPattern.test(attempt) ? await client.from("quiz_attempts")
      .select("score,passed,review").eq("activity_id", activity).eq("id", attempt).maybeSingle() : null;
    if (result?.data) {
      const { score, passed, review } = result.data;
      body = <>
        <h3 className="text-lg font-semibold">Result: {score}%{formal ? (passed ? " · Passed" : " · Not passed") : ""}</h3>
        {formal && !passed && <p>The passing score is {passingScore}%. You can try again.</p>}
        <ol className="space-y-3">
          {(review as Review[]).map((item, index) => (
            <li key={index} className="rounded-xl border border-[var(--border)] p-4">
              <h4 className="font-semibold">{index + 1}. {item.question}</h4>
              <p>{item.correct ? "Correct" : "Incorrect"}</p>
              <p>Your answer: {item.options.filter((option) => item.selected.includes(option.id)).map((option) => option.label).join(", ")}</p>
              <p>Correct answer: {item.options.filter((option) => item.correct_options.includes(option.id)).map((option) => option.label).join(", ")}</p>
              <p>{item.explanation}</p>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-4">
          {passed && <Link className="button" href={formal ? "/dashboard" : `/learn/${encodeURIComponent(chapter)}`}>Continue learning</Link>}
          <Link href={path}>Try again</Link>
        </div>
      </>;
    } else {
      body = <p>That attempt is unavailable. <Link href={path}>Return to the quiz</Link>.</p>;
    }
  } else {
    const { data, error } = await client.rpc("quiz_questions_for_learner", {
      target_chapter: chapter, target_activity: activity,
    });
    const questions: Question[] = Array.isArray(data) ? data : [];
    if (error || !questions.length) {
      body = <p role="alert">Questions are unavailable for this quiz.</p>;
    } else {
      body = <>
        <p>{questions.length} {questions.length === 1 ? "question" : "questions"}{formal ? ` · ${passingScore}% to pass` : " · Feedback after submission"}</p>
        {errorCode?.startsWith("quiz-") && <p role="alert">{errorCode === "quiz-answers"
          ? "Select a valid answer for every question and try again."
          : "Your quiz could not be submitted. Please try again."}</p>}
        <QuizForm action={submitQuiz.bind(null, chapter, activity, randomUUID())} questionCount={questions.length}>
          {questions.map((question, index) => (
            <fieldset key={question.id} className="min-w-0 space-y-2 rounded-xl border border-[var(--border)] p-4">
              <legend className="px-1 font-semibold">{index + 1}. {question.question}</legend>
              {question.question_type === "multiple" && <p className="text-sm">Select all that apply.</p>}
              {question.options.map((option) => (
                <label className="flex items-start gap-3" key={option.id}>
                  <input className="!inline-block !w-auto" type={question.question_type === "multiple" ? "checkbox" : "radio"}
                    name={`answer:${question.id}`} value={option.id} required={question.question_type !== "multiple"} />
                  <span>{option.label}</span>
                </label>
              ))}
              {!formal && question.hint && <details><summary className="cursor-pointer">Hint</summary><p>{question.hint}</p></details>}
            </fieldset>
          ))}
        </QuizForm>
      </>;
    }
  }

  return <section className="space-y-4" aria-label={formal ? "Chapter assessment" : "Knowledge check"}>
    {body}
    {!history.error && !!history.data.length && <details>
      <summary className="cursor-pointer">Recent attempts ({history.data.length})</summary>
      <ol className="mt-2 space-y-1">
        {history.data.map((row) => <li key={row.id}>
          <Link href={`${path}&attempt=${encodeURIComponent(row.id)}`}>
            {accessDate.format(new Date(row.submitted_at))} · {row.score}%{formal ? (row.passed ? " · Passed" : " · Not passed") : ""}
          </Link>
        </li>)}
      </ol>
    </details>}
  </section>;
}
