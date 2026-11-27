-- Authorisation lives in the database so direct RPC calls cannot bypass the UI.
create function private.is_administrator(learner uuid)
returns boolean language sql stable set search_path = ''
as $$
  select exists (select 1 from public.profiles where user_id = learner and role = 'administrator');
$$;
revoke all on function private.is_administrator(uuid) from public, anon, authenticated;

-- Defer sibling uniqueness checks during an atomic import so two rows can swap positions.
alter table public.modules drop constraint modules_topic_id_slug_key, drop constraint modules_topic_id_sort_order_key,
  add unique (topic_id, slug) deferrable initially deferred,
  add unique (topic_id, sort_order) deferrable initially deferred;
alter table public.chapters drop constraint chapters_module_id_slug_key, drop constraint chapters_module_id_sort_order_key,
  add unique (module_id, slug) deferrable initially deferred,
  add unique (module_id, sort_order) deferrable initially deferred;
alter table public.activities drop constraint activities_chapter_id_sort_order_key,
  add unique (chapter_id, sort_order) deferrable initially deferred;

create function public.admin_content_inventory()
returns table (kind text, id text, parent_id text, title text, status public.content_status, sort_order integer)
language sql stable security definer set search_path = ''
as $$
  select 'topic', t.id, null::text, t.title, t.status, t.sort_order from public.topics t
    where private.is_administrator(auth.uid())
  union all select 'module', m.id, m.topic_id, m.title, m.status, m.sort_order from public.modules m
    where private.is_administrator(auth.uid())
  union all select 'chapter', c.id, c.module_id, c.title, c.status, c.sort_order from public.chapters c
    where private.is_administrator(auth.uid())
  union all select 'activity', a.id, a.chapter_id, a.title, a.status, a.sort_order from public.activities a
    where private.is_administrator(auth.uid())
  order by sort_order, id;
$$;

create function public.admin_import_topic(payload jsonb)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  t jsonb := payload->'topic';
  m jsonb;
  c jsonb;
  a jsonb;
  q jsonb;
  position integer;
begin
  if not private.is_administrator(auth.uid()) then raise insufficient_privilege; end if;
  if payload->>'schemaVersion' is distinct from '1.0'
    or octet_length(payload::text) > 600000 then raise invalid_parameter_value; end if;
  perform pg_advisory_xact_lock(hashtextextended(t->>'id', 0));

  insert into public.topics (id,slug,title,description,objectives,difficulty,estimated_minutes,sort_order,status)
  values (t->>'id',t->>'slug',t->>'title',t->>'description',
    array(select jsonb_array_elements_text(t->'objectives')),t->>'difficulty',
    (t->>'estimatedMinutes')::integer,(t->>'order')::integer,'draft')
  on conflict (id) do update set slug=excluded.slug,title=excluded.title,description=excluded.description,
    objectives=excluded.objectives,difficulty=excluded.difficulty,estimated_minutes=excluded.estimated_minutes,
    sort_order=excluded.sort_order,status='draft',updated_at=now();

  for m in select value from jsonb_array_elements(t->'modules') loop
    insert into public.modules as existing (id,topic_id,slug,title,description,objectives,estimated_minutes,sort_order,status)
    values (m->>'id',t->>'id',m->>'slug',m->>'title',m->>'description',
      array(select jsonb_array_elements_text(m->'objectives')),
      (m->>'estimatedMinutes')::integer,(m->>'order')::integer,'draft')
    on conflict (id) do update set slug=excluded.slug,title=excluded.title,description=excluded.description,
      objectives=excluded.objectives,estimated_minutes=excluded.estimated_minutes,sort_order=excluded.sort_order,status='draft'
    where existing.topic_id=excluded.topic_id;
    if not found then raise exception 'Module ID is already used in another topic'; end if;
    for c in select value from jsonb_array_elements(m->'chapters') loop
      insert into public.chapters as existing (id,module_id,slug,title,description,objectives,estimated_minutes,sort_order,progression_mode,passing_score,status)
      values (c->>'id',m->>'id',c->>'slug',c->>'title',c->>'description',
        array(select jsonb_array_elements_text(c->'objectives')),
        (c->>'estimatedMinutes')::integer,(c->>'order')::integer,c->>'progressionMode',(c->>'passingScore')::integer,'draft')
      on conflict (id) do update set slug=excluded.slug,title=excluded.title,description=excluded.description,
        objectives=excluded.objectives,estimated_minutes=excluded.estimated_minutes,sort_order=excluded.sort_order,
        progression_mode=excluded.progression_mode,passing_score=excluded.passing_score,status='draft'
      where existing.module_id=excluded.module_id;
      if not found then raise exception 'Chapter ID is already used in another module'; end if;
      for a in select value from jsonb_array_elements(c->'activities') loop
        insert into public.activities as existing (id,chapter_id,title,type,description,content,estimated_minutes,sort_order,required,status)
        values (a->>'id',c->>'id',a->>'title',(a->>'type')::public.activity_type,a->>'description',
          coalesce(a->'content','{}'),(a->>'estimatedMinutes')::integer,(a->>'order')::integer,(a->>'required')::boolean,'draft')
        on conflict (id) do update set title=excluded.title,description=excluded.description,content=excluded.content,
          estimated_minutes=excluded.estimated_minutes,sort_order=excluded.sort_order,required=excluded.required,status='draft'
        where existing.chapter_id=excluded.chapter_id and existing.type=excluded.type;
        if not found then raise exception 'Activity ID is already in use with a different chapter or type'; end if;
        if a->>'type' in ('shortQuiz','finalQuiz') then
          delete from private.quiz_keys where activity_id=a->>'id';
          delete from public.quiz_questions where activity_id=a->>'id';
          position := 0;
          for q in select value from jsonb_array_elements(a->'questions') loop
            position := position + 1;
            insert into public.quiz_questions (activity_id,id,question,question_type,options,points,sort_order)
            values (a->>'id',q->>'id',q->>'question',q->>'questionType',q->'options',(q->>'points')::integer,position);
            insert into private.quiz_keys (activity_id,question_id,correct_option_ids,explanation,hint)
            values (a->>'id',q->>'id',array(select jsonb_array_elements_text(q->'correctOptionIds')),
              q->>'explanation',case when a->>'type'='shortQuiz' then q->>'hint' end);
          end loop;
        elsif a->>'type'='independentLab' then
          if a ? 'solution' then
            insert into private.lab_solutions (activity_id,markdown) values (a->>'id',a->>'solution')
            on conflict (activity_id) do update set markdown=excluded.markdown;
          else
            delete from private.lab_solutions where activity_id=a->>'id';
          end if;
        end if;
      end loop;
    end loop;
  end loop;
  set constraints all immediate;
  return t->>'id';
end;
$$;

create function public.admin_set_content_status(resource_kind text, resource_id text, next_status public.content_status,
  include_descendants boolean default false)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_administrator(auth.uid()) then raise insufficient_privilege; end if;
  case resource_kind
    when 'topic' then update public.topics set status=next_status,updated_at=now() where id=resource_id;
    when 'module' then update public.modules set status=next_status where id=resource_id;
    when 'chapter' then update public.chapters set status=next_status where id=resource_id;
    when 'activity' then update public.activities set status=next_status where id=resource_id;
    else return false;
  end case;
  if not found then return false; end if;
  if include_descendants and resource_kind='topic' and next_status='published' then
    -- Publish the current tree while leaving explicitly archived children archived.
    update public.modules set status='published' where topic_id=resource_id and status='draft';
    update public.chapters set status='published' where status='draft'
      and module_id in (select id from public.modules where topic_id=resource_id and status='published');
    update public.activities a set status='published' where a.status='draft'
      and exists (select 1 from public.chapters c join public.modules m on m.id=c.module_id
        where c.id=a.chapter_id and m.topic_id=resource_id and m.status='published' and c.status='published');
  end if;
  return true;
end;
$$;

revoke all on function public.admin_content_inventory(), public.admin_import_topic(jsonb),
  public.admin_set_content_status(text,text,public.content_status,boolean) from public, anon, authenticated;
grant execute on function public.admin_content_inventory(), public.admin_import_topic(jsonb),
  public.admin_set_content_status(text,text,public.content_status,boolean) to authenticated;
