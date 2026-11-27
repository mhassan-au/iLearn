-- Lab content and results use the same sequencing rules as lessons and quizzes.
create function public.read_lab(target_chapter text, target_activity text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select jsonb_object_agg(field.key, field.value) from jsonb_each(a.content) field
    where field.key in ('objective','objectives','prerequisites','tools','setup','safety',
      'troubleshooting','steps','scenario','evidence','tasks','deliverables','checklist','resources')
  ), '{}')
  from private.chapter_activity_access(target_chapter, auth.uid()) permitted
  join public.activities a on a.id = permitted.id
  where permitted.id = target_activity and permitted.unlocked
    and permitted.type in ('guidedLab', 'independentLab');
$$;

create function public.save_lab(target_chapter text, target_activity text,
  steps text[], learner_notes text, finish boolean)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  learner uuid := auth.uid();
  checklist jsonb;
  allowed text[];
begin
  select case when a.type = 'guidedLab' then a.content->'steps' else a.content->'checklist' end
  into checklist
  from private.chapter_activity_access(target_chapter, learner) permitted
  join public.activities a on a.id = permitted.id
  where permitted.id = target_activity and permitted.unlocked
    and permitted.type in ('guidedLab', 'independentLab');
  if not found or jsonb_typeof(checklist) is distinct from 'array'
    or finish is null or steps is null or learner_notes is null
    or cardinality(steps) > 200 or char_length(learner_notes) > 10000 then return false; end if;

  select array_agg(item->>'id') into allowed from jsonb_array_elements(checklist) item;
  if allowed is null or array_position(allowed, null) is not null
    or array_position(steps, null) is not null or not steps <@ allowed
    or (finish and not allowed <@ steps) then return false; end if;

  insert into public.lab_progress as existing (user_id, activity_id, completed_steps, notes, completed_at)
  values (learner, target_activity, steps, learner_notes, case when finish then now() end)
  on conflict (user_id, activity_id) do update set
    completed_steps = excluded.completed_steps, notes = excluded.notes,
    completed_at = coalesce(existing.completed_at, excluded.completed_at)
  where existing.completed_at is null or allowed <@ excluded.completed_steps;
  if not found then return false; end if;
  if finish then
    insert into public.activity_progress as existing (user_id, activity_id, completed_at)
    values (learner, target_activity, now())
    on conflict (user_id, activity_id) do update
      set completed_at = excluded.completed_at, updated_at = now()
      where existing.completed_at is null;
  end if;
  return true;
end;
$$;

create function public.reveal_lab_solution(target_chapter text, target_activity text)
returns text language sql stable security definer set search_path = ''
as $$
  select s.markdown
  from private.chapter_activity_access(target_chapter, auth.uid()) a
  join private.lab_solutions s on s.activity_id = a.id
  where a.id = target_activity and a.type = 'independentLab' and a.unlocked and a.completed;
$$;

revoke all on function public.read_lab(text, text), public.save_lab(text, text, text[], text, boolean),
  public.reveal_lab_solution(text, text) from public, anon, authenticated;
grant execute on function public.read_lab(text, text), public.save_lab(text, text, text[], text, boolean),
  public.reveal_lab_solution(text, text) to authenticated;

-- Existing hosted demo content predates the required tools field.
update public.activities set content = content || '{"tools":["Text editor or spreadsheet"]}'
where id = 'risk-review' and chapter_id = 'cia-triad' and not (content ? 'tools');
