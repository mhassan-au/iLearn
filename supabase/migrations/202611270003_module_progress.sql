-- Record activity visits without altering existing completion timestamps.
create function public.record_activity_visit(target_chapter text, target_activity text)
returns void language sql security definer set search_path = ''
as $$
  insert into public.activity_progress (user_id, activity_id)
  select auth.uid(), a.id
  from private.chapter_activity_access(target_chapter, auth.uid()) a
  where a.id = target_activity and a.unlocked
  on conflict (user_id, activity_id) do update set updated_at = now();
$$;

-- Aggregate across visible activities, weighted by activity count.
create function public.topic_module_progress(target_topic text)
returns table (module_id text, percent integer, last_accessed timestamptz)
language sql stable security definer set search_path = ''
as $$
  select m.id,
    coalesce((100 * count(a.id) filter (where a.completed) / nullif(count(a.id), 0))::integer, 0),
    max(p.updated_at)
  from public.modules m
  join public.topics t on t.id = m.topic_id
  left join public.chapters c on c.module_id = m.id and c.status = 'published'
  left join lateral private.chapter_activity_access(c.id, auth.uid()) a on true
  left join public.activity_progress p on p.activity_id = a.id and p.user_id = auth.uid()
  where t.id = target_topic and auth.uid() is not null
    and t.status = 'published' and m.status = 'published'
    and t.access_level = 'free' and m.access_level = 'free'
  group by m.id;
$$;

revoke all on function public.record_activity_visit(text, text),
  public.topic_module_progress(text) from public, anon, authenticated;
grant execute on function public.record_activity_visit(text, text),
  public.topic_module_progress(text) to authenticated;
