-- Annotations are personal study notes, separate from resettable activity work.
create table public.activity_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  chapter_id text not null references public.chapters,
  activity_id text not null references public.activities,
  quote text not null check (char_length(quote) between 1 and 1500),
  text_offset integer not null check (text_offset between 0 and 1000000),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index activity_annotations_learner_chapter_idx
  on public.activity_annotations (user_id, chapter_id, created_at);
alter table public.activity_annotations enable row level security;
revoke all on public.activity_annotations from public, anon, authenticated;
grant select on public.activity_annotations to authenticated;
create policy own_annotations on public.activity_annotations for select to authenticated
  using ((select auth.uid()) = user_id);

create function public.save_activity_annotation(target_chapter text, target_activity text,
  selected_quote text, selected_offset integer, note_body text, annotation_id uuid default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  learner uuid := auth.uid();
  saved uuid;
begin
  if learner is null or char_length(btrim(note_body)) not between 1 and 2000 or note_body is null
    or not exists (
      select 1 from private.chapter_activity_access(target_chapter, learner) a
      where a.id = target_activity and a.unlocked
    ) then return null; end if;

  if annotation_id is not null then
    update public.activity_annotations n set body = btrim(note_body), updated_at = now()
    where n.id = annotation_id and n.user_id = learner
      and n.chapter_id = target_chapter and n.activity_id = target_activity
    returning n.id into saved;
    return saved;
  end if;

  if selected_quote is null or char_length(btrim(selected_quote)) not between 1 and 1500
    or selected_offset is null or selected_offset not between 0 and 1000000 then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended(learner::text || ':' || target_chapter, 0));
  if (select count(*) from public.activity_annotations n where n.user_id = learner and n.chapter_id = target_chapter) >= 100
    then return null; end if;

  insert into public.activity_annotations (user_id,chapter_id,activity_id,quote,text_offset,body)
  values (learner,target_chapter,target_activity,btrim(selected_quote),selected_offset,btrim(note_body))
  returning id into saved;
  return saved;
end;
$$;

revoke all on function public.save_activity_annotation(text,text,text,integer,text,uuid) from public, anon, authenticated;
grant execute on function public.save_activity_annotation(text,text,text,integer,text,uuid) to authenticated;
