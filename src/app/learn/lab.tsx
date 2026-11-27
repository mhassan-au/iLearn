// Display lab instructions and notes, with a separate completed-only solution.
import Link from "next/link";
import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { learningClient } from "../../lib/learning";
import { CopyCommand } from "./copy-command";
import { saveLab } from "./lab-actions";
import { ActionButton } from "../components/action-button";
import { Toast } from "../components/toast";

type Step = {
  id: string; title: string; instructions: string; expectedResult?: string;
  hint?: string; workedAnswer?: string; command?: string; screenshot?: string;
};
type LabContent = {
  objective?: string; objectives?: string[]; prerequisites?: string[]; tools?: string[];
  setup?: string; safety?: string; troubleshooting?: string; steps?: Step[];
  scenario?: string; evidence?: string; tasks?: string[]; deliverables?: string[];
  checklist?: { id: string; label: string }[]; resources?: { label: string; url: string }[];
};

function LabText({ title, text }: { title: string; text?: string }) {
  return text ? <section><h3 className="font-semibold">{title}</h3>
    <div className="lesson-body"><Markdown skipHtml remarkPlugins={[remarkGfm]}>{text}</Markdown></div>
  </section> : null;
}

function StepSupport({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return <details className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
    <summary className="cursor-pointer font-semibold">{label}</summary>
    <div className="lesson-body mt-2"><Markdown skipHtml remarkPlugins={[remarkGfm]}>{text}</Markdown></div>
  </details>;
}

function LabList({ title, items }: { title: string; items?: string[] }) {
  return items?.length ? <section><h3 className="font-semibold">{title}</h3>
    <ul className="list-disc pl-6">{items.map((item, index) => <li key={index}>{item}</li>)}</ul>
  </section> : null;
}

export async function Lab({ client, chapter, activity, guided, completed, reveal, saved, errorCode }: {
  client: Awaited<ReturnType<typeof learningClient>>; chapter: string; activity: string;
  guided: boolean; completed: boolean; reveal: boolean; saved?: string; errorCode?: string;
}) {
  const [body, progress] = await Promise.all([
    client.rpc("read_lab", { target_chapter: chapter, target_activity: activity }),
    client.from("lab_progress").select("completed_steps,notes,self_assessment,step_notes").eq("activity_id", activity).maybeSingle(),
  ]);
  if (body.error || progress.error || !body.data) return <p role="alert">The lab could not be loaded.</p>;
  const lab = body.data as LabContent;
  const path = `/learn/${encodeURIComponent(chapter)}?activity=${encodeURIComponent(activity)}`;
  const solution = !guided && completed && reveal
    ? await client.rpc("reveal_lab_solution", { target_chapter: chapter, target_activity: activity })
    : null;

  const checkbox = (id: string, label: string, noteLabel = label) => <div className="flex items-start justify-between gap-3">
    <label className="flex items-start gap-3">
      <input type="checkbox" name="step" value={id} defaultChecked={progress.data?.completed_steps.includes(id)}
        className="!inline-block !w-auto" />
      <span>{label}</span>
    </label>
    <details className="lab-item-note">
      <summary aria-label={`Edit note for ${noteLabel}`} title={`Edit note for ${noteLabel}`}
        className={progress.data?.step_notes?.[id] ? "lab-note-trigger has-note" : "lab-note-trigger"}>
        <span aria-hidden="true">✎</span>
      </summary>
      <div className="lab-note-popover space-y-2">
        <label className="block text-sm font-semibold">Note for {noteLabel}
          <textarea name={`itemNote:${id}`} rows={3} maxLength={500} defaultValue={progress.data?.step_notes?.[id] ?? ""}
            className="mt-1 block w-full rounded border border-[var(--border)] p-2 font-normal" />
        </label>
        <ActionButton name="intent" value="save-item-note" className="button button-secondary" pendingLabel="Saving note…">Save note</ActionButton>
      </div>
    </details>
  </div>;

  return <div className="space-y-5">
    <LabText title="Scenario" text={lab.scenario} />
    <LabText title="Objective" text={lab.objective} />
    <LabList title="Objectives" items={lab.objectives} />
    <LabList title="Tools required" items={lab.tools} />
    {!lab.tools?.length && <p>Tools required: none specified.</p>}
    <LabList title="Prerequisites" items={lab.prerequisites} />
    <LabText title="Setup" text={lab.setup} />
    <LabText title="Safety and authorisation" text={lab.safety} />
    <LabText title="Provided evidence" text={lab.evidence} />
    <LabList title="Tasks" items={lab.tasks} />
    <LabList title="Expected deliverables" items={lab.deliverables} />
    {!!lab.resources?.length && <section>
      <h3 className="font-semibold">Resources</h3>
      <ul className="list-disc pl-6">{lab.resources.map((resource, index) => {
        const url = defaultUrlTransform(resource.url);
        return url ? <li key={index}><a href={url}>{resource.label}</a></li> : null;
      })}</ul>
    </section>}
    {saved && <Toast key={saved} message={completed ? "Lab complete. Your notes are saved." : "Lab notes and checklist saved."} />}
    {errorCode?.startsWith("lab-") && <p role="alert">{errorCode === "lab-checklist"
      ? "Check every item before completing the lab. You can save your work and come back."
      : "Your lab could not be saved. Please try again."}</p>}
    <form action={saveLab.bind(null, chapter, activity)} className="space-y-5">
      {guided ? <ol className="space-y-4">
        {lab.steps?.map((step, index) => <li key={step.id} className="space-y-3 rounded-xl border border-[var(--border)] p-4">
          <h3 className="font-semibold">{index + 1}. {step.title}</h3>
          <div className="lesson-body"><Markdown skipHtml remarkPlugins={[remarkGfm]}>{step.instructions}</Markdown></div>
          {step.command && <CopyCommand command={step.command} />}
          {step.screenshot && defaultUrlTransform(step.screenshot) &&
            <img src={defaultUrlTransform(step.screenshot)} alt={`Screenshot for ${step.title}`} className="max-w-full rounded-lg" />}
          <LabText title="Expected result" text={step.expectedResult} />
          <StepSupport label="Show hint" text={step.hint} />
          <StepSupport label="Show worked answer" text={step.workedAnswer} />
          {checkbox(step.id, "Step complete", step.title)}
        </li>)}
      </ol> : <fieldset className="space-y-2">
        <legend className="font-semibold">Completion checklist</legend>
        {lab.checklist?.map((item) => <div key={item.id}>{checkbox(item.id, item.label)}</div>)}
      </fieldset>}
      <LabText title="Troubleshooting" text={lab.troubleshooting} />
      <label className="block font-semibold">Your notes
        <textarea name="notes" rows={5} maxLength={10000} defaultValue={progress.data?.notes ?? ""}
          className="mt-2 block w-full rounded-lg border border-[var(--border)] p-3 font-normal" />
      </label>
      <label className="block font-semibold">How independently could you do this again? <span className="font-normal">(optional)</span>
        <select name="confidence" defaultValue={progress.data?.self_assessment ?? ""}
          className="mt-2 block w-full rounded-lg border border-[var(--border)] p-3 font-normal">
          <option value="">Choose if useful</option>
          <option value="needs-practice">Needs practice</option>
          <option value="with-guidance">Can do with guidance</option>
          <option value="independently">Can do independently</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-3">
        {!completed && <ActionButton name="intent" value="complete" pendingLabel="Completing lab…">Mark lab complete</ActionButton>}
        <ActionButton name="intent" value="save" className="button button-secondary" pendingLabel="Saving notes…">Save notes and checklist</ActionButton>
        {completed && <Link className="button" href={`/learn/${encodeURIComponent(chapter)}`}>Continue learning</Link>}
      </div>
    </form>
    {!guided && completed && <section className="space-y-3 rounded-xl border border-[var(--border)] p-4">
      <h3 className="font-semibold">Reference solution</h3>
      {reveal ? <>
        {typeof solution?.data === "string" ? <div className="lesson-body">
          <Markdown skipHtml remarkPlugins={[remarkGfm]}>{solution.data}</Markdown>
        </div> : <p>No reference solution is available.</p>}
        <Link href={path}>Hide solution</Link>
      </> : <Link href={`${path}&solution=show`} prefetch={false}>Reveal solution</Link>}
    </section>}
  </div>;
}
