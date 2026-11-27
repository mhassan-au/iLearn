-- Verify the sample assessment flow with a disposable learner.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(13);

insert into auth.users(id) values ('60000000-0000-4000-8000-000000000001'),
                                  ('60000000-0000-4000-8000-000000000002');
set local role authenticated;
set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000001';
select is((select count(*)::int from quiz_questions_for_learner('cia-triad','fundamentals')), 0, 'Locked questions stay hidden');
select ok(complete_lesson('cia-triad','intro'), 'Complete the prerequisite lesson');
select ok((select hint is not null from quiz_questions_for_learner('cia-triad','fundamentals')), 'Short quiz has a hint');
select is(submit_quiz('cia-triad','fundamentals','{"control":["unknown"]}','60000000-0000-4000-8000-000000000010'),
  null::uuid, 'Unknown option is rejected');
select is(submit_quiz('cia-triad','fundamentals','{"control":["b"]}','60000000-0000-4000-8000-000000000011'),
  '60000000-0000-4000-8000-000000000011'::uuid, 'Short quiz saves incorrect answer and feedback');
select is((select score from quiz_attempts where activity_id='fundamentals'), 0::numeric, 'Incorrect answer earns zero');
select ok((select completed from chapter_outline('cia-triad') where id='fundamentals'), 'Short quiz is complete on submission');

reset role;
insert into activity_progress(user_id, activity_id, completed_at)
select '60000000-0000-4000-8000-000000000001', id, now() from activities
where chapter_id='cia-triad' and sort_order between 3 and 6;
set local role authenticated;
select is((select count(*)::int from quiz_questions_for_learner('cia-triad','chapter-check') where hint is not null), 0, 'Formal assessment has no hints');
select ok(submit_quiz('cia-triad','chapter-check','{"disclosure":["c"],"controls":["backup"]}',
  '60000000-0000-4000-8000-000000000012') is not null, 'Formal attempt is recorded below pass mark');
select is((select completed from chapter_outline('cia-triad') where id='chapter-check'), false, 'Partial multiple-answer response fails');
select ok(submit_quiz('cia-triad','chapter-check','{"disclosure":["c"],"controls":["restore","backup"]}',
  '60000000-0000-4000-8000-000000000013') is not null, 'Exact set is accepted in any order');
select ok((select passed from quiz_attempts where id='60000000-0000-4000-8000-000000000013'), 'Exact set passes the formal quiz');
set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000002';
select is((select count(*)::int from quiz_attempts), 0, 'Learners cannot review each other’s attempts');
reset role;
select * from finish();
rollback;
