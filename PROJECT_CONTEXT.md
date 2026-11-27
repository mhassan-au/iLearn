# Project context

SelfLearn supports a single learner initially, with a path to free and paid access across subjects. The sequence is topic → module → chapter → ordered activity. Chapters default to sequential progression and an 80% passing score. Lessons use Markdown. The activity model also supports short quizzes, guided labs, independent labs and final quizzes.

The approved stack is Next.js App Router, React, TypeScript and Tailwind CSS on Vercel, with Supabase Auth and Postgres. SQL migrations define stable IDs, ordered content, separate learner records and explicit enrollment and entitlement records. Supabase Auth owns email addresses. Profile rows and roles can be provisioned separately as role-aware features are added.

The app uses request-scoped sessions and a publishable key. Database grants and row-level policies expose free published topic cards to signed-in users and scope learner-record reads to their owners. Activity delivery starts with the learning-navigation milestone, when server-side publication and progression checks can be applied. Quiz keys and lab solutions live in a private schema. Grading and completion will use trusted server operations. Membership tier is descriptive and future restricted access will use explicit entitlements and expiry.

The versioned JSON import planned for administration will validate and preview stable-ID upserts, preserve learner history and require explicit publication. The local SQL seed is a separate development fixture. The initial labs use fictional evidence. Payments, AI content generation and hosted lab environments are outside the MVP.
