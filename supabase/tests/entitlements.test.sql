-- Check published resource access with disposable administrator and learner roles.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(7);
insert into auth.users(id) values ('a1000000-0000-4000-8000-000000000001'),('a1000000-0000-4000-8000-000000000002');
insert into profiles(user_id,role) values ('a1000000-0000-4000-8000-000000000001','administrator');
update topics set access_level='restricted' where id='cyber-assurance';
insert into entitlements(user_id,topic_id,status,expires_at)
values ('a1000000-0000-4000-8000-000000000002','cyber-assurance','active',now()-interval '1 day');
set local role authenticated;
set local request.jwt.claim.sub='a1000000-0000-4000-8000-000000000002';
select is((select count(*)::integer from topics where id='cyber-assurance'),0,'Expired grant does not expose topic');
select is(read_lesson('cia-triad','intro'),null::jsonb,'Direct lesson URL cannot bypass scope');
select throws_ok($$select admin_grant_access(auth.uid(),'topic','cyber-assurance')$$,'42501',null,'Learner cannot grant access');
set local request.jwt.claim.sub='a1000000-0000-4000-8000-000000000001';
select ok(set_config('ilearn_test.grant',admin_grant_access('a1000000-0000-4000-8000-000000000002',
  'topic','cyber-assurance',now()+interval '1 day')::text,true) is not null,'Administrator can grant access');
set local request.jwt.claim.sub='a1000000-0000-4000-8000-000000000002';
select ok(read_lesson('cia-triad','intro') is not null,'Live grant opens topic and first lesson');
set local request.jwt.claim.sub='a1000000-0000-4000-8000-000000000001';
select ok(admin_revoke_access(current_setting('ilearn_test.grant')::uuid),'Administrator can revoke a grant');
set local request.jwt.claim.sub='a1000000-0000-4000-8000-000000000002';
select is(read_lesson('cia-triad','intro'),null::jsonb,'Revocation removes lesson access');
reset role;
select * from finish();
rollback;
