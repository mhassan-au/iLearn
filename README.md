# SelfLearn

SelfLearn is a linear, self-paced learning platform. Milestone 1 provides a protected dashboard, one sample topic and the database foundation.

## Run locally

1. Install Node.js 22, the Supabase CLI and a running Docker-compatible container engine.
2. Run `npm ci`, then `supabase start` and `supabase db reset` from this directory. The reset targets the local development database and replaces its data with the migrations and sample seed.
3. Copy `.env.example` to `.env.local`. Set the URL and publishable key from `supabase status` for your local instance.
4. In local Supabase Studio, create a confirmed user under Authentication → Users. Use a generated password if Studio requires one. The app signs in by magic link.
5. Run `npm run dev` and open [localhost:3000](http://localhost:3000).

## Verify

- Run `npm run typecheck`, `npm run build` and `supabase test db`.
- Open My learning in a private window. It should redirect to sign-in.
- In a regular browser window, request a link for the provisioned email. Open the message in the local mail viewer listed by `supabase status` and choose **Continue to My learning**. Confirm that the sample topic appears.
- Reopen the same browser profile after closing the browser and check that My learning still opens. After signing out, reuse the same link and check that it is rejected. Requesting a link for an unprovisioned address should give the same on-screen acknowledgement without creating a user.
- Try the flow at phone and desktop widths. Use the Tab key to check the skip link, input labels and visible focus. Switch the OS theme to check dark mode.

## Vercel and hosted Supabase

1. Create a Supabase project, enable the email provider and disable public signup. Create a confirmed user in Authentication → Users. Configure custom SMTP if your recipient is outside the Supabase project team or if you need production email delivery.
2. Link the CLI to the intended new project and apply `supabase db push`. The sample seed is local by default. Use `supabase db push --include-seed` on a fresh project if you want the fictional sample published there.
3. Push the source to your Git provider and import it as a Next.js project in Vercel. Set Node.js to 22.x and configure the two variables from `.env.example` with the hosted Supabase URL and publishable key. Keep database credentials and secret keys out of the app environment.
4. Deploy and set Supabase Auth's **Site URL** to your canonical Vercel URL. In Authentication → Email Templates, replace the **Magic Link** template with the contents of [magic-link.html](supabase/templates/magic-link.html). Run the manual sign-in checks against the deployment.

Magic links are single use and expire according to the project's email OTP settings. Once signed in, Supabase SSR keeps the session in persistent cookies and refreshes tokens as needed. Keep Supabase's time-box and inactivity limits unset, or set them to cover your desired number of weeks. Signing out, clearing browser cookies or revoking the session requires a new link.

The sign-in proxy follows the [Supabase SSR session guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs).
