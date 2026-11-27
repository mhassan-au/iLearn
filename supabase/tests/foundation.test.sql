-- Exercise permissions with the same roles and claims used by the API.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(10);

insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000001','owner@example.invalid'),
       ('10000000-0000-4000-8000-000000000002','other@example.invalid');
insert into public.profiles (user_id, role)
values ('10000000-0000-4000-8000-000000000001','learner'),
       ('10000000-0000-4000-8000-000000000002','administrator');
insert into public.topics (id, slug, title, description, estimated_minutes, sort_order, status, access_level)
values ('test-free','test-free','Free','',1,10,'published','free'),
       ('test-draft','test-draft','Draft','',1,11,'draft','free'),
       ('test-restricted','test-restricted','Restricted','',1,12,'published','restricted');
insert into public.modules (id, topic_id, slug, title, description, estimated_minutes, sort_order)
values ('test-module','test-free','test-module','Test module','',1,1);
insert into public.chapters (id, module_id, slug, title, description, estimated_minutes, sort_order)
values ('test-chapter','test-module','test-chapter','Test chapter','',1,1);
insert into public.activities (id, chapter_id, title, type, description, estimated_minutes, sort_order)
values ('test-activity','test-chapter','Test activity','lesson','',1,1);
insert into public.activity_progress (user_id, activity_id)
values ('10000000-0000-4000-8000-000000000001','test-activity'),
       ('10000000-0000-4000-8000-000000000002','test-activity');

set local role anon;
select throws_ok('select id from public.topics', '42501', null, 'Anonymous access is denied');
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select results_eq(
  $$select id from public.topics where id like 'test-%' order by id$$,
  $$values ('test-free'::text)$$,
  'Only published free topics are visible'
);
select results_eq(
  'select role from public.profiles order by role',
  $$values ('learner'::text)$$,
  'Learner can see only their own profile'
);
select throws_ok($$update public.profiles set role = 'administrator'$$, '42501', null, 'Role escalation is denied');
select results_eq(
  $$select user_id from public.activity_progress where activity_id = 'test-activity' order by user_id$$,
  $$values ('10000000-0000-4000-8000-000000000001'::uuid)$$,
  'Learners can only read their own progress'
);
select throws_ok('update public.quiz_attempts set score = 100', '42501', null, 'Score writes are denied');
select throws_ok('update public.activity_progress set completed_at = now()', '42501', null, 'Completion writes are denied');
select throws_ok('update public.topics set title = title', '42501', null, 'Content writes are denied');
select throws_ok('select * from private.quiz_keys', '42501', null, 'Answer keys are private');
select throws_ok('select * from private.lab_solutions', '42501', null, 'Reference solutions are private');
reset role;
select * from finish();
rollback;
