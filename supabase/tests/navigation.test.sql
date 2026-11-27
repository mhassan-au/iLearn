-- Exercise sequential and flexible access using the authenticated API role.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(11);

insert into auth.users(id) values ('20000000-0000-4000-8000-000000000001');
insert into public.topics(id, slug, title, description, estimated_minutes, sort_order, status)
values ('nav-topic', 'nav-topic', 'Test topic', '', 3, 100, 'published');
insert into public.modules(id, topic_id, slug, title, description, estimated_minutes, sort_order, status)
values ('nav-module', 'nav-topic', 'nav-module', 'Test module', '', 3, 1, 'published');
insert into public.chapters(id, module_id, slug, title, description, estimated_minutes, sort_order, status)
values ('nav-chapter', 'nav-module', 'nav-chapter', 'Test chapter', '', 3, 1, 'published');
insert into public.activities(id, chapter_id, title, type, description, content, estimated_minutes, sort_order, status)
values ('nav-first', 'nav-chapter', 'First', 'lesson', '', '{"markdown":"First"}', 1, 1, 'published'),
       ('nav-second', 'nav-chapter', 'Second', 'lesson', '', '{"markdown":"Second"}', 1, 2, 'published'),
       ('nav-quiz', 'nav-chapter', 'Quiz', 'shortQuiz', '', '{}', 1, 3, 'published'),
       ('nav-draft', 'nav-chapter', 'Draft', 'lesson', '', '{}', 1, 4, 'draft'),
       ('nav-last', 'nav-chapter', 'Last', 'lesson', '', '{}', 1, 5, 'published');

set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.chapter_outline('nav-chapter')), 4, 'Draft is omitted');
select is(public.read_lesson('nav-chapter','nav-first')->>'markdown', 'First', 'First lesson opens');
select is(public.read_lesson('nav-chapter','nav-second'), null::jsonb, 'Later lesson is locked');
select is(public.complete_lesson('nav-chapter','nav-second'), false, 'Locked lesson cannot be completed');
select is(public.complete_lesson('nav-chapter','nav-first'), true, 'Learner can complete first lesson');
select is(public.complete_lesson('nav-chapter','nav-first'), true, 'Completion can be retried');
select is(public.read_lesson('nav-chapter','nav-second')->>'markdown', 'Second', 'Second lesson unlocks');
select is(public.complete_lesson('nav-chapter','nav-second'), true, 'Second lesson completion unlocks quiz');
select is(public.complete_lesson('nav-chapter','nav-quiz'), false, 'Lesson action cannot complete a quiz');
reset role;
update public.chapters set progression_mode = 'flexible' where id = 'nav-chapter';
set local role authenticated;
select is((select unlocked from public.chapter_outline('nav-chapter') where id = 'nav-last'), true, 'Flexible mode unlocks later lessons');
set local role anon;
select throws_ok($$select public.chapter_outline('nav-chapter')$$, '42501', null, 'Anonymous outline is denied');
reset role;
select * from finish();
rollback;
