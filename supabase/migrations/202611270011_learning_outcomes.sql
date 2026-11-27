-- Answer accuracy remains in the feedback record and never gates progression.
create or replace function public.submit_quiz(target_chapter text, target_activity text, answers jsonb, attempt_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  learner uuid := auth.uid();
  quiz_type public.activity_type;
  threshold integer;
  q record;
  selected jsonb;
  correct boolean;
  total_points bigint := 0;
  earned_points bigint := 0;
  graded_count integer := 0;
  review_items jsonb := '[]';
  result_score numeric;
  did_pass boolean;
begin
  select a.type, c.passing_score into quiz_type, threshold
  from private.chapter_activity_access(target_chapter, learner) a
  join public.chapters c on c.id = target_chapter
  where a.id = target_activity and a.unlocked and a.type in ('shortQuiz', 'finalQuiz');
  if not found or attempt_id is null or jsonb_typeof(answers) is distinct from 'object'
      or octet_length(answers::text) > 65536 then
    return null;
  end if;

  for q in
    select question.*, k.correct_option_ids, k.explanation
    from public.quiz_questions question
    left join private.quiz_keys k on k.activity_id = question.activity_id and k.question_id = question.id
    where question.activity_id = target_activity
    order by question.sort_order
  loop
    selected := answers -> q.id;
    if q.correct_option_ids is null or jsonb_typeof(selected) is distinct from 'array' then return null; end if;
    if jsonb_array_length(selected) = 0
       or (q.question_type <> 'multiple' and jsonb_array_length(selected) <> 1)
       or exists (
         select 1 from jsonb_array_elements(selected) choice
         where jsonb_typeof(choice) <> 'string'
           or not exists (select 1 from jsonb_array_elements(q.options) option where option->'id' = choice)
       )
       or (select count(distinct choice) from jsonb_array_elements(selected) choice) <> jsonb_array_length(selected) then
      return null;
    end if;
    correct := selected @> to_jsonb(q.correct_option_ids)
      and jsonb_array_length(selected) = cardinality(q.correct_option_ids);
    graded_count := graded_count + 1;
    total_points := total_points + q.points;
    if correct then earned_points := earned_points + q.points; end if;
    review_items := review_items || jsonb_build_array(jsonb_build_object(
      'question', q.question, 'options', q.options, 'selected', selected,
      'correct_options', q.correct_option_ids, 'correct', correct, 'explanation', q.explanation
    ));
  end loop;
  if total_points = 0 or (select count(*) from jsonb_object_keys(answers)) <> graded_count then return null; end if;

  result_score := round(100 * earned_points::numeric / total_points, 2);
  did_pass := quiz_type = 'shortQuiz' or result_score >= threshold;
  insert into public.quiz_attempts (id, user_id, activity_id, submitted_answers, score, passed, started_at, review)
  values (attempt_id, learner, target_activity, answers, result_score, did_pass, now(), review_items)
  on conflict (id) do nothing;
  if not found then
    -- Network retries may repeat a submission. Only return the caller's matching attempt.
    if exists (select 1 from public.quiz_attempts r where r.id = attempt_id and r.user_id = learner
      and r.activity_id = target_activity and r.submitted_answers = answers) then return attempt_id; end if;
    return null;
  end if;

  insert into public.activity_progress (user_id, activity_id, completed_at)
  values (learner, target_activity, now())
  on conflict (user_id, activity_id) do update set completed_at = excluded.completed_at, updated_at = now()
    where public.activity_progress.completed_at is null;
  return attempt_id;
end;
$$;

-- Previous submissions already meet the new completion rule.
insert into public.activity_progress as existing (user_id, activity_id, started_at, completed_at, updated_at)
select q.user_id, q.activity_id, min(q.started_at), min(q.submitted_at), min(q.submitted_at)
from public.quiz_attempts q
join public.activities a on a.id = q.activity_id and a.type in ('shortQuiz', 'finalQuiz')
group by q.user_id, q.activity_id
on conflict (user_id, activity_id) do update
  set completed_at = excluded.completed_at, updated_at = greatest(existing.updated_at, excluded.updated_at)
  where existing.completed_at is null;

-- Optional reflection is private and has no effect on a lab's completion.
alter table public.lab_progress add column self_assessment text
  check (self_assessment in ('needs-practice','with-guidance','independently'));
drop function public.save_lab(text,text,text[],text,boolean);
create function public.save_lab(target_chapter text, target_activity text,
  steps text[], learner_notes text, finish boolean, confidence text default null)
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
    or (confidence is not null and confidence not in ('needs-practice','with-guidance','independently'))
    or cardinality(steps) > 200 or char_length(learner_notes) > 10000 then return false; end if;

  select array_agg(item->>'id') into allowed from jsonb_array_elements(checklist) item;
  if allowed is null or array_position(allowed, null) is not null
    or array_position(steps, null) is not null or not steps <@ allowed
    or (finish and not allowed <@ steps) then return false; end if;

  insert into public.lab_progress as existing (user_id, activity_id, completed_steps, notes, completed_at, self_assessment)
  values (learner, target_activity, steps, learner_notes, case when finish then now() end, confidence)
  on conflict (user_id, activity_id) do update set
    completed_steps = excluded.completed_steps, notes = excluded.notes,
    self_assessment = excluded.self_assessment,
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
revoke all on function public.save_lab(text,text,text[],text,boolean,text) from public, anon, authenticated;
grant execute on function public.save_lab(text,text,text[],text,boolean,text) to authenticated;

-- A module can set its own difficulty or inherit the topic's label.
alter table public.modules add column difficulty text
  check (difficulty in ('beginner','intermediate','advanced'));
alter function public.admin_import_topic(jsonb) set schema private;
revoke all on function private.admin_import_topic(jsonb) from public, anon, authenticated;
create function public.admin_import_topic(payload jsonb)
returns text language plpgsql security definer set search_path = ''
as $$
declare imported text;
begin
  imported := private.admin_import_topic(payload);
  update public.modules m set difficulty = item.value->>'difficulty'
  from jsonb_array_elements(payload->'topic'->'modules') item
  where m.topic_id = imported and m.id = item.value->>'id' and item.value ? 'difficulty';
  return imported;
end;
$$;
revoke all on function public.admin_import_topic(jsonb) from public, anon, authenticated;
grant execute on function public.admin_import_topic(jsonb) to authenticated;
