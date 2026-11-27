# Development progress

## Milestone 1

Implemented the responsive shell, provisioned-account username and password sign-in via Supabase Auth, persistent sessions, sign-out, protected dashboard, migration, access-policy tests and fictional sample chapter. The fixture covers two lessons, two short quizzes, a guided lab, an independent lab and a final quiz.

See [README](README.md) for setup, verification and deployment steps. Hosting and end-to-end authentication require a configured Supabase instance.

TypeScript, the production build and static seed checks passed. The SQL policy suite and signed-in browser checks await a Supabase test environment. Docker was unavailable in the development environment.

## Milestone 2

Implemented the catalogue, topic and module overviews, chapter outline, safe Markdown lesson reader, and lesson completion. Supabase enforces published access and required activity order within each sequential chapter. Flexible chapters allow any published free activity. Quiz and lab placeholders preserve the chapter sequence until their respective milestones.

Applied the navigation migration and sample seed to the hosted iLearn project. The production build passed. A transaction on the linked database verified the seven-activity outline, locked lesson access, lesson completion and quiz unlocking, then rolled back. The full pgTAP suite still requires Docker.

## Next milestone

The quiz engine adds short quizzes, protected final assessments, server-side grading, retries and attempt history. Lab interactions, progress aggregation, administration and entitlement management follow in their respective milestones.
