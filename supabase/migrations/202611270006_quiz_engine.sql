-- Store post-submission feedback with each attempt so reviews survive content edits.
alter table public.quiz_attempts add column review jsonb not null default '[]'
  check (jsonb_typeof(review) = 'array');

create function public.quiz_questions_for_learner(target_chapter text, target_activity text)
returns table (id text, question text, question_type text, options jsonb, hint text, points integer)
language sql stable security definer set search_path = ''
as $$
  select q.id, q.question, q.question_type, (
      select coalesce(jsonb_agg(jsonb_build_object('id', choice.value->>'id',
        'label', choice.value->>'label') order by choice.ordinality), '[]')
      from jsonb_array_elements(q.options) with ordinality choice
    ),
    case when a.type = 'shortQuiz' then k.hint end, q.points
  from private.chapter_activity_access(target_chapter, auth.uid()) a
  join public.quiz_questions q on q.activity_id = a.id
  left join private.quiz_keys k on k.activity_id = a.id and k.question_id = q.id
  where a.id = target_activity and a.unlocked and a.type in ('shortQuiz', 'finalQuiz')
  order by q.sort_order;
$$;

create function public.submit_quiz(target_chapter text, target_activity text, answers jsonb, attempt_id uuid)
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

  if did_pass then
    insert into public.activity_progress (user_id, activity_id, completed_at)
    values (learner, target_activity, now())
    on conflict (user_id, activity_id) do update set completed_at = excluded.completed_at, updated_at = now()
      where public.activity_progress.completed_at is null;
  end if;
  return attempt_id;
end;
$$;

revoke all on function public.quiz_questions_for_learner(text, text),
  public.submit_quiz(text, text, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.quiz_questions_for_learner(text, text),
  public.submit_quiz(text, text, jsonb, uuid) to authenticated;
