-- Expose the published hierarchy and gate lesson content and completion in SQL.
grant select on public.modules, public.chapters to authenticated;
create policy published_modules on public.modules for select to authenticated
  using (status = 'published' and access_level = 'free' and exists
    (select 1 from public.topics t where t.id = topic_id));
create policy published_chapters on public.chapters for select to authenticated
  using (status = 'published' and exists
    (select 1 from public.modules m where m.id = module_id));

-- Centralise access for both reading and writing so direct RPC calls follow the
-- same rules as the learner UI. Completed activities can be revisited.
create function private.chapter_activity_access(target_chapter text, learner uuid)
returns table (id text, title text, type public.activity_type, description text,
  estimated_minutes integer, sort_order integer, completed boolean, unlocked boolean)
language sql stable set search_path = ''
as $$
  with visible as (
    select a.*, p.completed_at is not null as done, c.progression_mode
    from public.activities a
    join public.chapters c on c.id = a.chapter_id
    join public.modules m on m.id = c.module_id
    join public.topics t on t.id = m.topic_id
    left join public.activity_progress p on p.activity_id = a.id and p.user_id = learner
    where learner is not null and a.chapter_id = target_chapter
      and a.status = 'published' and c.status = 'published'
      and m.status = 'published' and t.status = 'published'
      and a.access_level = 'free' and m.access_level = 'free' and t.access_level = 'free'
  )
  select a.id, a.title, a.type, a.description, a.estimated_minutes, a.sort_order, a.done,
    a.done or a.progression_mode = 'flexible' or not exists (
      select 1 from visible earlier
      where earlier.sort_order < a.sort_order and earlier.required and not earlier.done
    )
  from visible a order by a.sort_order;
$$;
revoke all on function private.chapter_activity_access(text, uuid) from public, anon, authenticated;

create function public.chapter_outline(target_chapter text)
returns table (id text, title text, type public.activity_type, description text,
  estimated_minutes integer, sort_order integer, completed boolean, unlocked boolean)
language sql stable security definer set search_path = ''
as $$
  select * from private.chapter_activity_access(target_chapter, auth.uid())
  order by sort_order;
$$;

create function public.read_lesson(target_chapter text, target_activity text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select a.content from private.chapter_activity_access(target_chapter, auth.uid()) permitted
  join public.activities a on a.id = permitted.id
  where permitted.id = target_activity and permitted.unlocked and permitted.type = 'lesson';
$$;

create function public.complete_lesson(target_chapter text, target_activity text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare learner uuid := auth.uid();
begin
  if not exists (
    select 1 from private.chapter_activity_access(target_chapter, learner) a
    where a.id = target_activity and a.unlocked and a.type = 'lesson'
  ) then
    return false;
  end if;
  insert into public.activity_progress (user_id, activity_id, completed_at)
  values (learner, target_activity, now())
  on conflict (user_id, activity_id) do update
    set completed_at = excluded.completed_at, updated_at = now()
    where public.activity_progress.completed_at is null;
  return true;
end;
$$;

revoke all on function public.chapter_outline(text), public.read_lesson(text, text),
  public.complete_lesson(text, text) from public, anon, authenticated;
grant execute on function public.chapter_outline(text), public.read_lesson(text, text),
  public.complete_lesson(text, text) to authenticated;
