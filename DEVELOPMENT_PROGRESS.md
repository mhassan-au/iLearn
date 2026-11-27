# Development progress

## Learning-focused progression

Quiz scores and pass labels are hidden from learners. Completing a knowledge check means submitting a valid response, regardless of accuracy. Answer explanations and retry history remain available. Labs retain their practical completion checklists and support optional private confidence reflections. Topics and modules display Foundational, Applied or Advanced difficulty.

## Milestone 1

Implemented the responsive shell, provisioned-account username and password sign-in via Supabase Auth, persistent sessions, sign-out, protected dashboard, migration, access-policy tests and fictional sample chapter. The fixture covers two lessons, two short quizzes, a guided lab, an independent lab and a final quiz.

See [README](README.md) for setup, verification and deployment steps. Hosting and end-to-end authentication require a configured Supabase instance.

TypeScript, the production build and static seed checks passed. The SQL policy suite and signed-in browser checks await a Supabase test environment. Docker was unavailable in the development environment.

## Milestone 2

Implemented the catalogue, topic and module overviews, chapter outline, safe Markdown lesson reader, and lesson completion. Supabase enforces published access and required activity order within each sequential chapter. Flexible chapters allow any published free activity. Quiz and lab placeholders preserve the chapter sequence until their respective milestones.

Applied the navigation migration and sample seed to the hosted iLearn project. The production build passed. A transaction on the linked database verified the seven-activity outline, locked lesson access, lesson completion and quiz unlocking, then rolled back. The full pgTAP suite still requires Docker.

My learning now highlights the most recently accessed unfinished topic and shows its next unlocked activity. The topic overview uses the same resume data, with numerical topic progress and shaded module bars. The resume migration is applied and was verified before and after completing the first sample lesson.

## Milestone 3

Implemented short quizzes and formal assessments with single-answer, multiple-answer, true/false and scenario questions. Grading runs in Postgres, and submitted attempts include the learner's score, answer review and explanations. Short quizzes advance on submission. Final quizzes advance after reaching the chapter pass mark. The quiz migration is applied to iLearn. Transaction-scoped checks verified access, grading and attempt privacy. The full pgTAP runner still requires Docker.

## Milestone 4

Guided and independent labs now show required tools, instructions or tasks, checklists and private learner notes. Completing each checklist unlocks the next activity. The independent lab's reference solution is available only after completion and an explicit reveal.

## Milestone 5

My progress lists topic completion, completed labs, recent quiz results and completed lessons. Each history entry links back to the relevant activity or attempt. Topic pages provide the module and chapter breakdown.

## Milestone 6

The protected content editor validates versioned topic JSON, previews its contents and reports which IDs already exist. Imports update matching IDs as drafts and preserve learner records. The content list provides publish, unpublish and archive controls.

## Milestone 7

Content admin supports free, preview and restricted items and manual grants with expiry and revocation. A shared Supabase policy enforces access across catalogue and learner RPCs. The app includes a web manifest and Vercel setup instructions.

All migrations are applied to the hosted iLearn project. A rolled-back database test verified grants, revocation and completion of all seven sample activities in order, including three quiz attempts in My progress. The production build passed. Vercel deployment, a visual mobile/desktop walkthrough and the full Docker-backed pgTAP suite are pending.
