-- Pick the first unfinished, unlocked activity in the published learning order.
create function public.learning_resume(target_topic text default null)
returns table (topic_id text, topic_slug text, topic_title text, completed_count integer,
  activity_count integer, last_accessed timestamptz, module_title text, chapter_id text,
  chapter_title text, activity_id text, activity_title text, activity_type public.activity_type)
language sql stable security definer set search_path = ''
as $$
  select t.id, t.slug, t.title, stats.done, stats.total, stats.last_accessed,
    next_item.module_title, next_item.chapter_id, next_item.chapter_title,
    next_item.activity_id, next_item.activity_title, next_item.activity_type
  from public.topics t
  cross join lateral (
    select coalesce(sum(s.completed_count), 0)::integer as done,
      coalesce(sum(s.activity_count), 0)::integer as total, max(s.last_accessed) as last_accessed
    from private.topic_module_state(t.id, auth.uid()) s
  ) stats
  left join lateral (
    select m.title as module_title, c.id as chapter_id, c.title as chapter_title,
      a.id as activity_id, a.title as activity_title, a.type as activity_type
    from private.topic_module_state(t.id, auth.uid()) state
    join public.modules m on m.id = state.module_id
    join public.chapters c on c.module_id = m.id and c.status = 'published'
    cross join lateral private.chapter_activity_access(c.id, auth.uid()) a
    where state.unlocked and state.completed_count < state.activity_count
      and a.unlocked and not a.completed
    order by m.sort_order, m.id, c.sort_order, a.sort_order
    limit 1
  ) next_item on true
  where auth.uid() is not null and t.status = 'published' and t.access_level = 'free'
    and (target_topic is null or t.id = target_topic)
  order by t.sort_order, t.id;
$$;
revoke all on function public.learning_resume(text) from public, anon, authenticated;
grant execute on function public.learning_resume(text) to authenticated;
