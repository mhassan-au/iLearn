// Version 1 authoring format. Strict fields keep grading keys and solutions separate.
import { z } from "zod";

const id = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/);
const title = z.string().trim().min(1).max(200);
const text = z.string().trim().min(1).max(30000);
const items = z.array(title).max(100);
const minutes = z.number().int().positive().max(100000);
const order = z.number().int().positive().max(100000);
const url = z.url({ protocol: /^https?:$/ });
const link = z.strictObject({ label: title, url });
const checklist = z.strictObject({ id, label: title });
const question = z.strictObject({
  id, question: text, questionType: z.enum(["single", "multiple", "boolean"]),
  options: z.array(z.strictObject({ id, label: title })).min(2).max(20),
  correctOptionIds: z.array(id).min(1).max(20), explanation: text,
  hint: text.optional(), points: z.number().int().min(1).max(100).default(1),
}).superRefine((q, ctx) => {
  const optionIds = new Set(q.options.map((option) => option.id));
  if (optionIds.size !== q.options.length) ctx.addIssue({ code: "custom", path: ["options"], message: "Duplicate option ID" });
  if (q.correctOptionIds.some((option) => !optionIds.has(option)) ||
      new Set(q.correctOptionIds).size !== q.correctOptionIds.length ||
      (q.questionType !== "multiple" && q.correctOptionIds.length !== 1)) {
    ctx.addIssue({ code: "custom", path: ["correctOptionIds"], message: "Use unique IDs from the question's options" });
  }
  if (q.questionType === "boolean" && (optionIds.size !== 2 || !optionIds.has("true") || !optionIds.has("false"))) {
    ctx.addIssue({ code: "custom", path: ["options"], message: "True/false questions require true and false option IDs" });
  }
});

const common = { id, title, description: text, estimatedMinutes: minutes, order, required: z.boolean().default(true) };
const activity = z.discriminatedUnion("type", [
  z.strictObject({ ...common, type: z.literal("lesson"), content: z.strictObject({
    markdown: text, objectives: items.default([]), takeaways: items.default([]),
  }) }),
  z.strictObject({ ...common, type: z.literal("shortQuiz"), questions: z.array(question).min(1).max(100) }),
  z.strictObject({ ...common, type: z.literal("finalQuiz"), questions: z.array(question).min(1).max(100) }),
  z.strictObject({ ...common, type: z.literal("guidedLab"), content: z.strictObject({
    objective: text, tools: items.min(1), prerequisites: items.default([]),
    setup: text, safety: text, troubleshooting: text.optional(),
    resources: z.array(link).max(30).optional(),
    steps: z.array(z.strictObject({
      id, title, instructions: text, expectedResult: text, command: text.optional(), screenshot: url.optional(),
    })).min(1).max(100),
  }) }),
  z.strictObject({ ...common, type: z.literal("independentLab"), solution: text.optional(), content: z.strictObject({
    scenario: text, objectives: items.default([]), tools: items.min(1), evidence: text.optional(),
    safety: text.optional(), tasks: items.min(1), deliverables: items.min(1),
    checklist: z.array(checklist).min(1).max(100), resources: z.array(link).max(30).optional(),
  }) }),
]);
const overview = { id, slug: id, title, description: text, estimatedMinutes: minutes, order, objectives: items.default([]) };
const chapter = z.strictObject({ ...overview, passingScore: z.number().int().min(1).max(100).default(80),
  progressionMode: z.enum(["sequential", "flexible"]).default("sequential"),
  activities: z.array(activity).min(1).max(100) });
const moduleSchema = z.strictObject({ ...overview, difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  chapters: z.array(chapter).min(1).max(50) });
const schema = z.strictObject({
  schemaVersion: z.literal("1.0"),
  topic: z.strictObject({ ...overview, difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
    modules: z.array(moduleSchema).min(1).max(20) }),
});
export type TopicImport = z.infer<typeof schema>;

export function parseTopicImport(raw: string): { value: TopicImport; errors?: never } | { value?: never; errors: string[] } {
  if (new TextEncoder().encode(raw).length > 500000) return { errors: ["Import must be 500 KB or smaller."] };
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return { errors: ["Enter valid JSON."] }; }
  const result = schema.safeParse(json);
  if (!result.success) return { errors: result.error.issues.map((issue) => `${issue.path.join(".") || "Import"}: ${issue.message}`) };

  const errors: string[] = [];
  const seen = { modules: new Set<string>(), chapters: new Set<string>(), activities: new Set<string>() };
  function unique(values: (string | number)[], label: string) {
    if (new Set(values).size !== values.length) errors.push(`Duplicate ${label}.`);
  }
  function register(kind: keyof typeof seen, value: string) {
    if (seen[kind].has(value)) errors.push(`Duplicate ID in ${kind}: ${value}.`);
    seen[kind].add(value);
  }
  const topic = result.data.topic;
  unique(topic.modules.map((m) => m.slug), "module slug");
  unique(topic.modules.map((m) => m.order), "module order");
  for (const m of topic.modules) {
    register("modules", m.id);
    unique(m.chapters.map((c) => c.slug), `chapter slug in ${m.id}`);
    unique(m.chapters.map((c) => c.order), `chapter order in ${m.id}`);
    for (const c of m.chapters) {
      register("chapters", c.id);
      unique(c.activities.map((a) => a.order), `activity order in ${c.id}`);
      const final = c.activities.filter((a) => a.type === "finalQuiz");
      if (final.length !== 1 || final[0].order !== Math.max(...c.activities.map((a) => a.order))) {
        errors.push(`Chapter ${c.id} must end with exactly one final quiz.`);
      }
      for (const a of c.activities) {
        register("activities", a.id);
        if ("questions" in a) {
          unique(a.questions.map((q) => q.id), `question ID in ${a.id}`);
          if (a.type === "finalQuiz" && a.questions.some((q) => q.hint)) errors.push(`Final quiz ${a.id} cannot have hints.`);
        } else if (a.type === "guidedLab") unique(a.content.steps.map((step) => step.id), `step ID in ${a.id}`);
        else if (a.type === "independentLab") unique(a.content.checklist.map((item) => item.id), `checklist ID in ${a.id}`);
      }
    }
  }
  return errors.length ? { errors } : { value: result.data };
}
