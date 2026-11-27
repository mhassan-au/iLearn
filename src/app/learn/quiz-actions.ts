"use server";

// Grade through Supabase and leave the browser on the submitted attempt.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { learningClient } from "../../lib/learning";

export async function submitQuiz(chapter: string, activity: string, attempt: string, form: FormData) {
  const client = await learningClient();
  const path = `/learn/${encodeURIComponent(chapter)}?activity=${encodeURIComponent(activity)}`;
  const answers: Record<string, string[]> = Object.create(null);

  for (const [name, value] of form) {
    if (!name.startsWith("answer:") || typeof value !== "string") continue;
    const question = name.slice("answer:".length);
    (answers[question] ??= []).push(value);
  }

  const { data, error } = await client.rpc("submit_quiz", {
    target_chapter: chapter, target_activity: activity, answers, attempt_id: attempt,
  });
  if (error || typeof data !== "string") {
    redirect(`${path}&error=${error ? "quiz-unavailable" : "quiz-answers"}`);
  }
  revalidatePath("/dashboard");
  revalidatePath("/progress");
  revalidatePath("/topics/[topic]", "page");
  redirect(`${path}&attempt=${encodeURIComponent(data)}&notice=quiz-submitted`);
}
