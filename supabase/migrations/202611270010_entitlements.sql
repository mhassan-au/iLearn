-- One entitlement decision shared by catalogue policies and learning RPCs.
create function private.can_access_level(learner uuid, level public.access_level,
  topic text, module text, activity text)
returns boolean language sql stable set search_path = ''
as $$
  select learner is not null and (level in ('free','preview') or exists (
    select 1 from public.entitlements e where e.user_id = learner and e.status = 'active'
      and (e.expires_at is null or e.expires_at > now())
      and (e.topic_id = topic or e.module_id = module or e.activity_id = activity)
  ));
$$;
revoke all on function private.can_access_level(uuid,public.access_level,text,text,text) from public, anon, authenticated;

-- RLS uses the caller's verified identity. The private evaluator takes an explicit
-- learner ID so internal progression functions can reuse it.
create function public.has_learning_access(level public.access_level, topic text, module text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.can_access_level(auth.uid(), level, topic, module, null);
$$;
revoke all on function public.has_learning_access(public.access_level,text,text) from public, anon, authenticated;
grant execute on function public.has_learning_access(public.access_level,text,text) to authenticated;

alter policy published_topics on public.topics
  using (status = 'published' and public.has_learning_access(access_level,id,null));
alter policy published_modules on public.modules
  using (status = 'published' and public.has_learning_access(access_level,topic_id,id)
    and exists (select 1 from public.topics t where t.id = topic_id));

create or replace function private.topic_module_state(target_topic text, learner uuid)
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
      and a.status = 'published'
      and private.can_access_level(learner, a.access_level, t.id, m.id, a.id)
    left join public.activity_progress p on p.activity_id = a.id and p.user_id = learner
    where t.id = target_topic and learner is not null
      and t.status = 'published' and m.status = 'published'
      and private.can_access_level(learner, t.access_level, t.id, null, null)
      and private.can_access_level(learner, m.access_level, t.id, m.id, null)
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
      and a.status = 'published'
      and private.can_access_level(learner, a.access_level, m.topic_id, m.id, a.id)
  )
  select a.id, a.title, a.type, a.description, a.estimated_minutes, a.sort_order, a.done,
    a.module_open and (a.done or a.progression_mode = 'flexible' or not exists (
      select 1 from visible earlier
      where earlier.sort_order < a.sort_order and earlier.required and not earlier.done
    ))
  from visible a order by a.sort_order;
$$;

create or replace function public.learning_resume(target_topic text default null)
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
  where auth.uid() is not null and t.status = 'published' and private.can_access_level(auth.uid(), t.access_level, t.id, null, null)
    and (target_topic is null or t.id = target_topic)
  order by t.sort_order, t.id;
$$;

create function public.admin_set_access(resource_kind text, resource_id text, level public.access_level)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_administrator(auth.uid()) then raise insufficient_privilege; end if;
  case resource_kind
    when 'topic' then update public.topics set access_level=level where id=resource_id;
    when 'module' then update public.modules set access_level=level where id=resource_id;
    when 'activity' then update public.activities set access_level=level where id=resource_id;
    else return false;
  end case;
  return found;
end;
$$;

create function public.admin_grant_access(learner uuid, resource_kind text, resource_id text, expiration timestamptz default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare granted uuid;
begin
  if not private.is_administrator(auth.uid()) then raise insufficient_privilege; end if;
  if resource_kind not in ('topic','module','activity') or (expiration is not null and expiration <= now()) then
    return null;
  end if;
  insert into public.entitlements (user_id,topic_id,module_id,activity_id,status,expires_at)
  values (learner, case when resource_kind='topic' then resource_id end,
    case when resource_kind='module' then resource_id end,
    case when resource_kind='activity' then resource_id end,'active',expiration)
  returning id into granted;
  return granted;
end;
$$;

create function public.admin_revoke_access(grant_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_administrator(auth.uid()) then raise insufficient_privilege; end if;
  update public.entitlements set status='revoked' where id=grant_id;
  return found;
end;
$$;

create function public.admin_list_access()
returns table (id uuid, user_id uuid, resource_id text, resource_kind text, expires_at timestamptz, status text)
language sql stable security definer set search_path = ''
as $$
  select e.id, e.user_id, coalesce(e.topic_id,e.module_id,e.activity_id),
    case when e.topic_id is not null then 'topic' when e.module_id is not null then 'module' else 'activity' end,
    e.expires_at, e.status
  from public.entitlements e where private.is_administrator(auth.uid()) and e.status='active'
  order by e.expires_at nulls last, e.id;
$$;

revoke all on function public.admin_set_access(text,text,public.access_level),
  public.admin_grant_access(uuid,text,text,timestamptz), public.admin_revoke_access(uuid), public.admin_list_access()
  from public, anon, authenticated;
grant execute on function public.admin_set_access(text,text,public.access_level),
  public.admin_grant_access(uuid,text,text,timestamptz), public.admin_revoke_access(uuid), public.admin_list_access()
  to authenticated;
