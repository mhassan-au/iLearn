"use server";

// Revalidate author input on every request and leave operation permissions to Postgres.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { learningClient } from "../../lib/learning";
import { parseTopicImport } from "../../lib/topic-import";

export type ImportFeedback = {
  errors?: string[]; saved?: string;
  preview?: { title: string; modules: number; chapters: number; activities: number; updates: number; lesson?: string };
};

export async function importTopic(_: ImportFeedback, form: FormData): Promise<ImportFeedback> {
  const client = await learningClient();
  const { data: profile } = await client.from("profiles").select("role").maybeSingle();
  if (profile?.role !== "administrator") return { errors: ["Administrator access required."] };
  const raw = form.get("payload");
  if (typeof raw !== "string") return { errors: ["Enter the topic JSON."] };
  const parsed = parseTopicImport(raw);
  if (!parsed.value) return { errors: parsed.errors };
  const { topic } = parsed.value;
  if (form.get("intent") === "import") {
    const { error } = await client.rpc("admin_import_topic", { payload: parsed.value });
    if (error) return { errors: [error.code === "23505"
      ? "An existing item already uses one of these slugs or positions. Use its stable ID for an update, or choose a different slug or position."
      : "The import could not be saved. Check that existing IDs still belong to the same topic, module or chapter and that activity types are unchanged."] };
    revalidatePath("/admin");
    revalidatePath("/topics", "layout");
    revalidatePath("/dashboard");
    return { saved: topic.title };
  }
  const { data, error } = await client.rpc("admin_content_inventory");
  if (error) return { errors: ["Could not compare the import with existing content."] };
  const existing = new Set((Array.isArray(data) ? data : []).map((row) => `${row.kind}:${row.id}`));
  const chapters = topic.modules.flatMap((module) => module.chapters);
  const activities = chapters.flatMap((chapter) => chapter.activities);
  const keys = [`topic:${topic.id}`, ...topic.modules.map((m) => `module:${m.id}`),
    ...chapters.map((c) => `chapter:${c.id}`), ...activities.map((a) => `activity:${a.id}`)];
  const firstLesson = activities.find((activity) => activity.type === "lesson");
  return { preview: { title: topic.title, modules: topic.modules.length, chapters: chapters.length,
    activities: activities.length, updates: keys.filter((key) => existing.has(key)).length,
    lesson: firstLesson?.content.markdown } };
}

export async function setContentStatus(kind: string, id: string, form: FormData) {
  const client = await learningClient();
  const status = form.get("status");
  if (status !== "published" && status !== "draft" && status !== "archived") redirect("/admin?failed=1");
  const { data, error } = await client.rpc("admin_set_content_status", {
    resource_kind: kind, resource_id: id, next_status: status, include_descendants: kind === "topic",
  });
  if (error || !data) redirect("/admin?failed=1");
  revalidatePath("/admin");
  revalidatePath("/topics", "layout");
  revalidatePath("/dashboard");
  redirect("/admin?updated=1");
}
