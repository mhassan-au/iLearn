// Connect the completed knowledge check to actions each role can take.
import { quizRecapSchema } from "../../lib/topic-import";
import type { learningClient } from "../../lib/learning";

function RecapList({ items }: { items: string[] }) {
  return <ul className="list-disc space-y-1 pl-5">{items.map((item, index) => <li key={index}>{item}</li>)}</ul>;
}

export async function QuizRecap({ client, chapter, activity, attempt }: {
  client: Awaited<ReturnType<typeof learningClient>>; chapter: string; activity: string; attempt: string;
}) {
  const { data } = await client.rpc("quiz_learning_recap", {
    target_chapter: chapter, target_activity: activity, submitted_attempt: attempt,
  });
  const parsed = quizRecapSchema.safeParse(data);
  if (!parsed.success) return null;
  const recap = parsed.data;
  return <section className="space-y-4 border-t border-[var(--border)] pt-5">
    <h3 className="text-xl font-semibold">What you learned and how to use it</h3>
    <RecapList items={recap.summary} />
    <div className="grid gap-3 lg:grid-cols-3">
      {recap.roles.map(({ title, actions }) => <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4" key={title}>
        <h4 className="font-semibold">{title}</h4>
        <RecapList items={actions} />
      </div>)}
    </div>
    <div className="space-y-2 border-l-4 border-[var(--accent)] pl-4">
      <h4 className="font-semibold">How to apply this in assessment and assurance</h4>
      <RecapList items={recap.assurance} />
    </div>
  </section>;
}
