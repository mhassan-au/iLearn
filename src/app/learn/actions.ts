"use server";

// Save lesson completion through the same SQL gate used by the reader.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { learningClient } from "../../lib/learning";

export async function recordActivityVisit(chapter: string, activity: string) {
  const client = await learningClient();
  const { error } = await client.rpc("record_activity_visit", { target_chapter: chapter, target_activity: activity });
  if (!error) revalidatePath("/dashboard");
}

export async function completeLesson(chapter: string, activity: string) {
  const client = await learningClient();
  const { data, error } = await client.rpc("complete_lesson", {
    target_chapter: chapter,
    target_activity: activity,
  });
  const path = `/learn/${encodeURIComponent(chapter)}`;
  if (error || !data) {
    redirect(`${path}?activity=${encodeURIComponent(activity)}&error=completion`);
  }
  revalidatePath("/dashboard");
  revalidatePath("/progress");
  revalidatePath("/topics/[topic]", "page");
  redirect(`${path}?notice=lesson-complete`);
}
