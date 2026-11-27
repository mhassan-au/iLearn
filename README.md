# SelfLearn

SelfLearn is a linear, self-paced learning platform. Milestone 1 provides a protected dashboard, one sample topic and the database foundation.

## Run locally

1. Install Node.js 22, the Supabase CLI and a running Docker-compatible container engine.
2. Run `npm ci`, then `supabase start` and `supabase db reset` from this directory. The reset targets the local development database and replaces its data with the migrations and sample seed.
3. Copy `.env.example` to `.env.local`. Set the URL and publishable key from `supabase status` for your local instance.
4. Provision a username and password in local Supabase Studio using the steps below. If `.env.local` already points to your hosted iLearn project, provision the account there and run the app locally with those settings.
5. Run `npm run dev` and open [localhost:3000](http://localhost:3000).

## Verify

In a supported browser, open a lesson and select **Listen to lesson**. Pause, resume and stop playback. Starting playback does not change completion. Leaving the lesson stops the audio.

- Run `npm run typecheck`, `npm run build` and `supabase test db`.
- Open My learning in a private window. It should redirect to sign-in.
- Enter a wrong password and check that a generic error appears. Then use the provisioned username and password and confirm that My learning opens. The sample topic appears if the seed was applied.
- Reopen the same browser profile and check that My learning still opens. Sign out and confirm that the dashboard redirects to sign-in.
- Try the flow at phone and desktop widths. Use the Tab key to check the skip link, input labels and visible focus. Switch the OS theme to check dark mode.
- Sign in, open **Topics → Cybersecurity Assessment, Risk and Assurance → Cybersecurity and Assessment Foundations → Cybersecurity Principles and the CIA Triad**. The first lesson should open. Try `/learn/cia-triad?activity=cia` before completing its prerequisites, then return to the first lesson and mark it complete. Confirm the chapter shows one completed activity, the first quiz is unlocked, and the completed lesson can still be opened.
- Submit the first quiz, check the feedback and recent attempts, then select **Continue learning**. The next lesson should open. At each lab, save a partial checklist and notes, reload to verify persistence, then check all items and mark it complete. The independent lab's solution can be revealed after completion. Completing both labs unlocks the final quiz.

## Provision a sign-in account

You can create a confirmed Supabase user with a regular email address and password, then sign in with that full email address. Keep **Auto Confirm User** enabled when provisioning the account.

In Supabase **Authentication → Users**, create a user with a strong password and enable **Auto Confirm User**. For username `learner`, use `learner@ilearn.invalid` as the Supabase email address. In the app, enter either `learner` or the full internal address, and that password. Usernames are case-insensitive, use 3–32 letters, digits, underscores or hyphens, and start with a letter or digit.

Keep the Email provider enabled in Supabase and disable public signup. The internal address is only an account identifier. Password changes for these accounts are handled by the project owner, since the internal address cannot receive reset mail.

## Vercel and hosted Supabase

1. Create the Supabase project and provision your account as described above.
2. Link the CLI to the intended new project and apply `supabase db push`. The sample seed is local by default. Use `supabase db push --include-seed` on a fresh project if you want the fictional sample published there.
3. Push the source to your Git provider and import it as a Next.js project in Vercel. Set Node.js to 22.x and configure the two variables from `.env.example` with the hosted Supabase URL and publishable key. Keep database credentials and secret keys out of the app environment.
4. Deploy and set Supabase Auth's **Site URL** to your canonical Vercel URL. Run the manual sign-in checks against the deployment.

Set `NEXT_PUBLIC_SUPABASE_URL` to the base project URL shown in Supabase Connect, such as `https://<project-ref>.supabase.co`. The SDK supplies the Auth and Data API paths. Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the `sb_publishable_…` key. Restart the local server or redeploy after changing these values.

Supabase SSR keeps the session in persistent cookies and refreshes tokens as needed. Keep Supabase's time-box and inactivity limits unset, or set them to cover your desired number of weeks.

## Protect sign-in from bots

1. Create a Cloudflare Turnstile widget and allow your Vercel deployment hostname. If you intend to sign in locally against the same hosted Supabase project, also allow your chosen local hostname or use a separate Supabase project and widget for development.
2. Put the widget's public **site key** in `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Vercel and, if applicable, `.env.local`. Redeploy or restart, and check that the security challenge loads.
3. In Supabase Auth settings, open **Bot and Abuse Protection**, enable CAPTCHA, choose **Turnstile**, and paste the widget's **secret key** there. Keep the secret out of Vercel public variables and Git. Apply this setting once your sign-in page is ready, because it affects all sign-ins on that Supabase project.
4. Test that a valid challenge lets you sign in and that a sign-in without a challenge is rejected. Leave Supabase Auth's built-in rate limits enabled.

This uses [Supabase's CAPTCHA verification](https://supabase.com/docs/guides/auth/auth-captcha) and applies to Auth requests that bypass the app. The browser widget is optional until its site key is configured. The app displays a cooldown message when Supabase rate-limits a request.

The sign-in proxy follows the [Supabase SSR session guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs).

## Prepare your first topic

Use the [versioned import format](content/IMPORT_FORMAT.md). To enable `/admin`, set your account's role to `administrator` from the Supabase SQL Editor, using its user ID from Authentication → Users.

```sql
insert into public.profiles (user_id, role)
values ('YOUR_AUTH_USER_UUID', 'administrator')
on conflict (user_id) do update set role = excluded.role;
```

Sign in and open `/admin`. Validate and preview your JSON, save it as a draft, then select **Publish topic and drafts** when ready.

Content is free by default. In Content admin, set a topic, module or activity to **Restricted** and grant a learner access using their Supabase user ID. Grants can expire or be revoked. A parent must also be accessible, and a grant never bypasses the learning order. Preview items are available to signed-in learners with access to the parent hierarchy.

Before deploying, keep public signup disabled, rotate any shared test password and verify the sample chapter with a learner account. Check sign-in, lesson completion, quiz feedback, lab persistence, solution reveal, the final quiz and My progress on desktop and mobile. The app includes a web manifest and uses online sessions for learner content.
