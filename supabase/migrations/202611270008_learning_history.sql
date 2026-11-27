-- Return a bounded activity history for the signed-in learner.
create function public.personal_learning_history()
returns table (activity_id text, chapter_id text, title text, type public.activity_type,
  happened_at timestamptz, attempt_id uuid, score numeric, passed boolean)
language sql stable security definer set search_path = ''
as $$
  with entries as (
    (select p.activity_id, p.completed_at as happened_at, null::uuid as attempt_id,
      null::numeric as score, null::boolean as passed
    from public.activity_progress p where p.user_id = auth.uid() and p.completed_at is not null
    order by p.completed_at desc, p.activity_id limit 20)
    union all
    (select q.activity_id, q.submitted_at, q.id, q.score, q.passed
    from public.quiz_attempts q where q.user_id = auth.uid()
    order by q.submitted_at desc, q.id limit 20)
  )
  select a.id, c.id, a.title, a.type, e.happened_at, e.attempt_id, e.score, e.passed
  from entries e
  join public.activities a on a.id = e.activity_id
  join public.chapters c on c.id = a.chapter_id
  where exists (
    select 1 from private.chapter_activity_access(c.id, auth.uid()) visible
    where visible.id = a.id and visible.unlocked
  )
  order by e.happened_at desc, e.activity_id, e.attempt_id;
$$;

revoke all on function public.personal_learning_history() from public, anon, authenticated;
grant execute on function public.personal_learning_history() to authenticated;
