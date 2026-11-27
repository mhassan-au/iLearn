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
