-- New questions and per-item lab notes retain existing learner history.
alter table public.quiz_questions add column difficulty text not null default 'medium'
  check (difficulty in ('easy','medium','hard'));
alter table public.lab_progress add column step_notes jsonb not null default '{}'
  check (jsonb_typeof(step_notes) = 'object');

alter function public.quiz_questions_for_learner(text,text) rename to quiz_questions_with_hints;
alter function public.quiz_questions_with_hints(text,text) set schema private;
revoke all on function private.quiz_questions_with_hints(text,text) from public, anon, authenticated;
create function public.quiz_questions_for_learner(target_chapter text,target_activity text)
returns table (id text, question text, question_type text, options jsonb, hint text, points integer, difficulty text)
language sql stable security definer set search_path = ''
as $$
  select shown.*, q.difficulty
  from private.quiz_questions_with_hints(target_chapter,target_activity) shown
  join public.quiz_questions q on q.id=shown.id and q.activity_id=target_activity
  order by case q.difficulty when 'easy' then 1 when 'medium' then 2 else 3 end, q.sort_order;
$$;
revoke all on function public.quiz_questions_for_learner(text,text) from public, anon, authenticated;
grant execute on function public.quiz_questions_for_learner(text,text) to authenticated;

alter function public.save_lab(text,text,text[],text,boolean,text) set schema private;
revoke all on function private.save_lab(text,text,text[],text,boolean,text) from public, anon, authenticated;
create function public.save_lab(target_chapter text,target_activity text,steps text[],learner_notes text,
  finish boolean,confidence text default null,item_notes jsonb default null)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare lab jsonb;
begin
  if item_notes is not null then
    lab := public.read_lab(target_chapter,target_activity);
    if lab is null or jsonb_typeof(item_notes) <> 'object' or octet_length(item_notes::text) > 30000 then return false; end if;
    if exists (
      select 1 from jsonb_each(item_notes) n
      where jsonb_typeof(n.value) <> 'string' or char_length(n.value #>> '{}') > 500
        or not exists (select 1 from jsonb_array_elements(coalesce(lab->'steps',lab->'checklist','[]')) s where s->>'id'=n.key)
    ) then return false; end if;
  end if;
  if not private.save_lab(target_chapter,target_activity,steps,learner_notes,finish,confidence) then return false; end if;
  if item_notes is not null then
    update public.lab_progress set step_notes=item_notes where user_id=auth.uid() and activity_id=target_activity;
  end if;
  return true;
end;
$$;
revoke all on function public.save_lab(text,text,text[],text,boolean,text,jsonb) from public, anon, authenticated;
grant execute on function public.save_lab(text,text,text[],text,boolean,text,jsonb) to authenticated;

alter function public.admin_import_topic(jsonb) rename to admin_import_topic_with_module_difficulty;
alter function public.admin_import_topic_with_module_difficulty(jsonb) set schema private;
revoke all on function private.admin_import_topic_with_module_difficulty(jsonb) from public, anon, authenticated;
create function public.admin_import_topic(payload jsonb)
returns text language plpgsql security definer set search_path = ''
as $$
declare imported text;
begin
  imported := private.admin_import_topic_with_module_difficulty(payload);
  update public.quiz_questions q set difficulty=coalesce(question->>'difficulty','medium')
  from jsonb_array_elements(payload->'topic'->'modules') m
  cross join lateral jsonb_array_elements(m->'chapters') c
  cross join lateral jsonb_array_elements(c->'activities') a
  cross join lateral jsonb_array_elements(a->'questions') question
  where q.activity_id=a->>'id' and q.id=question->>'id';
  return imported;
end;
$$;
revoke all on function public.admin_import_topic(jsonb) from public, anon, authenticated;
grant execute on function public.admin_import_topic(jsonb) to authenticated;

-- Extra fictional practice questions for the sample chapter.
update public.quiz_questions set difficulty = case when id='controls' then 'medium' else 'easy' end
where (activity_id,id) in (('fundamentals','control'),('cia-check','availability'),('chapter-check','disclosure'),('chapter-check','controls'));

insert into public.quiz_questions(activity_id,id,question,question_type,options,sort_order,difficulty)
select v.* from (values
('fundamentals','risk-statement','Fictional scenario: a shop has a public sharing link for a customer spreadsheet. Which statement is a risk rather than an observation?','single','[{"id":"o1","label":"A public link exists."},{"id":"o2","label":"Someone outside the shop could use the link to read customer details."}]'::jsonb,2,'medium'),
('fundamentals','verify-control','Fictional scenario: the shop says public sharing is disabled. Which evidence best supports both the setting and its actual enforcement?','multiple','[{"id":"o1","label":"A current sharing configuration showing public links are disabled"},{"id":"o2","label":"A test showing an external account cannot open the file"},{"id":"o3","label":"A meeting note saying the control is planned"}]'::jsonb,3,'hard'),
('cia-check','wrong-booking','Fictional scenario: an authorised staff member accidentally changes a booking date, and staff can still open the calendar. What is the primary issue?','single','[{"id":"o1","label":"Confidentiality"},{"id":"o2","label":"Integrity"},{"id":"o3","label":"Availability"}]'::jsonb,2,'medium'),
('cia-check','restore-evidence','Fictional scenario: a timed backup restore meets the recovery deadline. What should the assessor also check before concluding that the booking service recovered?','multiple','[{"id":"o1","label":"The restored record count and sample bookings match expected data"},{"id":"o2","label":"Staff can perform a representative booking task"},{"id":"o3","label":"Whether the backup dashboard has a green icon"}]'::jsonb,3,'hard'),
('chapter-check','evidence-limit','Fictional scenario: an access list shows a former employee still has permission. The case file contains no usage logs. What can you conclude?','single','[{"id":"o1","label":"The former employee definitely read records after leaving."},{"id":"o2","label":"The permission remained in place, and post-departure access is unverified."},{"id":"o3","label":"There is no issue unless the employee used the account."}]'::jsonb,3,'hard'),
('chapter-check','action-priority','Fictional scenario: the booking system has an active former staff account and an untested backup. Which immediate actions are supported by the evidence?','multiple','[{"id":"o1","label":"Remove the former staff account and verify revocation"},{"id":"o2","label":"Schedule a restore test and record the outcome"},{"id":"o3","label":"State that customer records have already been stolen"}]'::jsonb,4,'hard')
) v(activity_id,id,question,question_type,options,sort_order,difficulty)
where exists (select 1 from public.activities a where a.id=v.activity_id and a.chapter_id='cia-triad')
on conflict do nothing;

insert into private.quiz_keys(activity_id,question_id,correct_option_ids,explanation)
select v.activity_id,v.id,v.correct,v.explanation from (values
('fundamentals','risk-statement','Fictional scenario: a shop has a public sharing link for a customer spreadsheet. Which statement is a risk rather than an observation?',array['o2'],'The risk statement connects the observed weakness to a plausible event and effect. The existence of the link is evidence.'),
('fundamentals','verify-control','Fictional scenario: the shop says public sharing is disabled. Which evidence best supports both the setting and its actual enforcement?',array['o1','o2'],'A configuration shows intent. A targeted access test checks that the protection operates. A plan does not prove implementation.'),
('cia-check','wrong-booking','Fictional scenario: an authorised staff member accidentally changes a booking date, and staff can still open the calendar. What is the primary issue?',array['o2'],'The booking is still accessible, but the information has become inaccurate.'),
('cia-check','restore-evidence','Fictional scenario: a timed backup restore meets the recovery deadline. What should the assessor also check before concluding that the booking service recovered?',array['o1','o2'],'The clock alone does not establish that the restored information is accurate or that the service is usable.'),
('chapter-check','evidence-limit','Fictional scenario: an access list shows a former employee still has permission. The case file contains no usage logs. What can you conclude?',array['o2'],'The list supports a finding about retained access. It does not show whether the account was used.'),
('chapter-check','action-priority','Fictional scenario: the booking system has an active former staff account and an untested backup. Which immediate actions are supported by the evidence?',array['o1','o2'],'The access and restore gaps justify defensive actions. The evidence does not establish theft.')
) v(activity_id,id,question,correct,explanation)
join public.quiz_questions q on q.activity_id=v.activity_id and q.id=v.id and q.question=v.question
on conflict do nothing;
