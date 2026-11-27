// Require verified learner identity before loading course pages.
import { redirect } from "next/navigation";
import { requestClient } from "./supabase";

export async function learningClient() {
  const client = await requestClient();
  if (!client) redirect("/sign-in");
  const { data } = await client.auth.getClaims();
  if (!data?.claims.sub) redirect("/sign-in");
  return client;
}
