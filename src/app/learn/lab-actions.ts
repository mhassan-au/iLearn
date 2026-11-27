"use server";

// Persist notes and checklists through the authorised lab operation.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { learningClient } from "../../lib/learning";

export async function saveLab(chapter: string, activity: string, form: FormData) {
  const client = await learningClient();
  const path = `/learn/${encodeURIComponent(chapter)}?activity=${encodeURIComponent(activity)}`;
  const done = form.get("intent") === "complete";
  const confidence = form.get("confidence");
  const { data, error } = await client.rpc("save_lab", {
    target_chapter: chapter, target_activity: activity,
    steps: form.getAll("step").filter((value): value is string => typeof value === "string"),
    learner_notes: String(form.get("notes") ?? ""), finish: done,
    confidence: typeof confidence === "string" && confidence ? confidence : null,
  });
  if (error || !data) redirect(`${path}&error=${error ? "lab-save" : "lab-checklist"}`);
  revalidatePath("/dashboard");
  revalidatePath("/progress");
  revalidatePath("/topics/[topic]", "page");
  redirect(`${path}&saved=${done ? "complete" : "draft"}`);
}
