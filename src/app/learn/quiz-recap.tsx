// Connect the completed chapter to actions each role can take.
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
  if (!parsed.success) return <p>{data ? "The recap could not be loaded." : "This chapter has no published recap yet."}</p>;
  const recap = parsed.data;
  return <div className="space-y-4">
    <RecapList items={recap.summary} />
    <div className="grid gap-3 lg:grid-cols-3">
      {recap.roles.map(({ title, actions }) => <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4" key={title}>
        <h3 className="font-semibold">{title}</h3>
        <RecapList items={actions} />
      </div>)}
    </div>
    <div className="space-y-2 border-l-4 border-[var(--accent)] pl-4">
      <h3 className="font-semibold">How to apply this in assessment and assurance</h3>
      <RecapList items={recap.assurance} />
    </div>
  </div>;
}
