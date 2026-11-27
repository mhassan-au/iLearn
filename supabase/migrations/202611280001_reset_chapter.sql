-- Reset only the caller's work in an accessible chapter, keeping private notes.
create function public.reset_chapter(target_chapter text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare learner uuid := auth.uid();
begin
  if learner is null or not exists (
    select 1 from private.chapter_activity_access(target_chapter, learner) a where a.unlocked
  ) then
    return false;
  end if;

  delete from public.quiz_attempts q using public.activities a
    where q.user_id = learner and q.activity_id = a.id and a.chapter_id = target_chapter;
  update public.lab_progress p
    set completed_steps = '{}', completed_at = null, self_assessment = null
    from public.activities a
    where p.user_id = learner and p.activity_id = a.id and a.chapter_id = target_chapter;
  delete from public.activity_progress p using public.activities a
    where p.user_id = learner and p.activity_id = a.id and a.chapter_id = target_chapter;
  return true;
end;
$$;

revoke all on function public.reset_chapter(text) from public, anon, authenticated;
grant execute on function public.reset_chapter(text) to authenticated;
