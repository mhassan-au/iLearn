# SelfLearn

SelfLearn is a linear, self-paced learning platform. Milestone 1 provides a protected dashboard, one sample topic and the database foundation.

## Run locally

1. Install Node.js 22, the Supabase CLI and a running Docker-compatible container engine.
2. Run `npm ci`, then `supabase start` and `supabase db reset` from this directory. The reset targets the local development database and replaces its data with the migrations and sample seed.
3. Copy `.env.example` to `.env.local`. Set the URL and publishable key from `supabase status` for your local instance.
4. In local Supabase Studio, create an email/password account under Authentication → Users and enable auto-confirm for that account. The app supports accounts provisioned by the project owner.
5. Run `npm run dev` and open [localhost:3000](http://localhost:3000).

## Verify

- Run `npm run typecheck`, `npm run build` and `supabase test db`.
- Open My learning in a private window. It should redirect to sign-in.
- Submit an incorrect password and check that the form displays a generic error. Sign in with the provisioned account and confirm that the sample topic appears. Refresh the dashboard, then sign out and confirm the dashboard redirects again.
- Try the flow at phone and desktop widths. Use the Tab key to check the skip link, input labels and visible focus. Switch the OS theme to check dark mode.

## Vercel and hosted Supabase

1. Create a Supabase project and disable public signup for the personal MVP. Provision your account in the Authentication dashboard.
2. Link the CLI to the intended new project and apply `supabase db push`. The sample seed is local by default. Use `supabase db push --include-seed` on a fresh project if you want the fictional sample published there.
3. Push the source to your Git provider and import it as a Next.js project in Vercel. Set Node.js to 22.x and configure the two variables from `.env.example` with the hosted Supabase URL and publishable key. Keep database credentials and secret keys out of the app environment.
4. Deploy, set Supabase Auth's Site URL to your Vercel URL and repeat the manual sign-in checks against the deployment.

The sign-in proxy follows the [Supabase SSR session guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs).
