"use server";

// Validate annotation input and let Supabase enforce access and ownership.
import { revalidatePath } from "next/cache";
import { learningClient } from "../../lib/learning";

export async function saveAnnotation(chapter: string, activity: string, input: {
  id?: string; quote: string; offset: number; body: string;
}) {
  if (!input || typeof input.body !== "string" || !input.body.trim() || input.body.length > 2000 ||
    typeof input.quote !== "string" || !input.quote.trim() || input.quote.length > 1500 ||
    !Number.isInteger(input.offset) || input.offset < 0 || input.offset > 1000000 ||
    (input.id && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(input.id))) {
    return { error: "Select up to 1,500 characters and enter a note of up to 2,000 characters." };
  }
  const client = await learningClient();
  const { data, error } = await client.rpc("save_activity_annotation", {
    target_chapter: chapter, target_activity: activity, selected_quote: input.quote,
    selected_offset: input.offset, note_body: input.body, annotation_id: input.id ?? null,
  });
  if (error || typeof data !== "string") return { error: "Your note could not be saved. Check that the activity is unlocked and the chapter has fewer than 100 notes." };
  revalidatePath(`/learn/${encodeURIComponent(chapter)}`);
  return { id: data };
}
