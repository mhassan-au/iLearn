# Topic import format 1.0

Start with [the sample JSON](examples/topic-v1.json). Use the content admin to validate and preview it, then save it as a draft.

- Each topic contains modules, each module contains chapters, and each chapter contains activities. Each item needs a stable ID, title, description, estimated minutes and positive order. Topic, module and chapter records also have a slug.
- Chapter progression defaults to sequential and the passing score defaults to 80%. End each chapter with exactly one final quiz.
- Lessons use Markdown with optional objectives and takeaways. Markdown supports tables, images, links and code. Raw HTML is excluded from rendering.
- Quiz questions use single, multiple or boolean answer types. Use stable option IDs and supply the correct option IDs and explanation. Boolean options use IDs true and false. Add hints to short quizzes only.
- Both lab types require a tools list. Guided labs have numbered steps with expected results and optional commands and screenshots. Independent labs have tasks, deliverables and a checklist. Put the optional solution in the activity's solution field, outside its learner content.
- Preserve existing IDs when editing. Keep each ID under the same parent and retain its activity type. Reorder with distinct sibling order numbers. Omitted items remain in the database. Archive obsolete items explicitly.
- Importing replaces the questions and optional solution for the included activities while preserving learner records and previously stored quiz reviews. Imported records become drafts. Publishing is a separate action.
- Keep source JSON containing solutions and grading keys private. Use only fictional or cleared content.
