-- Compute completion independently of the access gate to avoid circular checks.
create function private.topic_module_state(target_topic text, learner uuid)
returns table (module_id text, completed_count integer, activity_count integer,
  last_accessed timestamptz, completed_at timestamptz, unlocked boolean)
language sql stable set search_path = ''
as $$
  with totals as (
    select m.id, m.sort_order, count(p.completed_at)::integer as done,
      count(a.id)::integer as total, max(p.updated_at) as accessed,
      max(p.completed_at) as finished
    from public.modules m
    join public.topics t on t.id = m.topic_id
    left join public.chapters c on c.module_id = m.id and c.status = 'published'
    left join public.activities a on a.chapter_id = c.id
      and a.status = 'published' and a.access_level = 'free'
    left join public.activity_progress p on p.activity_id = a.id and p.user_id = learner
    where t.id = target_topic and learner is not null
      and t.status = 'published' and m.status = 'published'
      and t.access_level = 'free' and m.access_level = 'free'
    group by m.id
  )
  select m.id, m.done, m.total, m.accessed,
    case when m.done = m.total then m.finished end,
    not exists (
      select 1 from totals earlier
      where (earlier.sort_order, earlier.id) < (m.sort_order, m.id)
        and earlier.done < earlier.total
    )
  from totals m;
$$;
revoke all on function private.topic_module_state(text, uuid) from public, anon, authenticated;

drop function public.topic_module_progress(text);
create function public.topic_module_progress(target_topic text)
returns table (module_id text, percent integer, last_accessed timestamptz,
  completed_count integer, activity_count integer, completed_at timestamptz, unlocked boolean)
language sql stable security definer set search_path = ''
as $$
  select m.module_id, coalesce(100 * m.completed_count::bigint / nullif(m.activity_count, 0), 0)::integer,
    m.last_accessed, m.completed_count, m.activity_count, m.completed_at, m.unlocked
  from private.topic_module_state(target_topic, auth.uid()) m;
$$;
revoke all on function public.topic_module_progress(text) from public, anon, authenticated;
grant execute on function public.topic_module_progress(text) to authenticated;

-- Existing lesson reads, completions and visit writes all use this gate.
create or replace function private.chapter_activity_access(target_chapter text, learner uuid)
returns table (id text, title text, type public.activity_type, description text,
  estimated_minutes integer, sort_order integer, completed boolean, unlocked boolean)
language sql stable set search_path = ''
as $$
  with visible as (
    select a.*, p.completed_at is not null as done, c.progression_mode, state.unlocked as module_open
    from public.activities a
    join public.chapters c on c.id = a.chapter_id
    join public.modules m on m.id = c.module_id
    join lateral private.topic_module_state(m.topic_id, learner) state on state.module_id = m.id
    left join public.activity_progress p on p.activity_id = a.id and p.user_id = learner
    where a.chapter_id = target_chapter and c.status = 'published'
      and a.status = 'published' and a.access_level = 'free'
  )
  select a.id, a.title, a.type, a.description, a.estimated_minutes, a.sort_order, a.done,
    a.module_open and (a.done or a.progression_mode = 'flexible' or not exists (
      select 1 from visible earlier
      where earlier.sort_order < a.sort_order and earlier.required and not earlier.done
    ))
  from visible a order by a.sort_order;
$$;
