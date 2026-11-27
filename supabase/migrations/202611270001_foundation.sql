-- Define the learning hierarchy and isolate learner state and answer keys.
create schema private;
revoke all on schema private from public, anon, authenticated;

create type public.content_status as enum ('draft', 'published', 'archived');
create type public.access_level as enum ('free', 'preview', 'restricted');
create type public.activity_type as enum ('lesson', 'shortQuiz', 'guidedLab', 'independentLab', 'finalQuiz');

create table public.topics (
  id text primary key,
  slug text not null unique,
  title text not null,
  description text not null,
  objectives text[] not null default '{}',
  difficulty text not null default 'beginner',
  thumbnail text,
  estimated_minutes integer not null check (estimated_minutes > 0),
  sort_order integer not null check (sort_order > 0),
  access_level public.access_level not null default 'free',
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.modules (
  id text primary key,
  topic_id text not null references public.topics,
  slug text not null,
  title text not null,
  description text not null,
  objectives text[] not null default '{}',
  estimated_minutes integer not null check (estimated_minutes > 0),
  sort_order integer not null check (sort_order > 0),
  access_level public.access_level not null default 'free',
  status public.content_status not null default 'draft',
  unique (topic_id, slug), unique (topic_id, sort_order)
);
create table public.chapters (
  id text primary key,
  module_id text not null references public.modules,
  slug text not null,
  title text not null,
  description text not null,
  objectives text[] not null default '{}',
  estimated_minutes integer not null check (estimated_minutes > 0),
  sort_order integer not null check (sort_order > 0),
  progression_mode text not null default 'sequential' check (progression_mode in ('sequential', 'flexible')),
  passing_score integer not null default 80 check (passing_score between 1 and 100),
  status public.content_status not null default 'draft',
  unique (module_id, slug), unique (module_id, sort_order)
);
create table public.activities (
  id text primary key,
  chapter_id text not null references public.chapters,
  title text not null,
  type public.activity_type not null,
  description text not null,
  content jsonb not null default '{}' check (jsonb_typeof(content) = 'object'),
  estimated_minutes integer not null check (estimated_minutes > 0),
  sort_order integer not null check (sort_order > 0),
  required boolean not null default true,
  access_level public.access_level not null default 'free',
  status public.content_status not null default 'draft',
  unique (chapter_id, sort_order)
);
create table public.quiz_questions (
  activity_id text not null references public.activities,
  id text not null,
  question text not null,
  question_type text not null check (question_type in ('single', 'multiple', 'boolean')),
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  points integer not null default 1 check (points > 0),
  sort_order integer not null check (sort_order > 0),
  primary key (activity_id, id), unique (activity_id, sort_order)
);
create table private.quiz_keys (
  activity_id text not null,
  question_id text not null,
  correct_option_ids text[] not null check (cardinality(correct_option_ids) > 0),
  explanation text not null,
  hint text,
  primary key (activity_id, question_id),
  foreign key (activity_id, question_id) references public.quiz_questions
);
create table private.lab_solutions (
  activity_id text primary key references public.activities,
  markdown text not null
);
create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text,
  role text not null default 'learner' check (role in ('learner', 'administrator')),
  membership_tier text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.enrollments (
  user_id uuid not null references auth.users on delete cascade,
  topic_id text not null references public.topics,
  status text not null check (status in ('active', 'revoked')),
  enrolled_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (user_id, topic_id)
);
create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  topic_id text references public.topics,
  module_id text references public.modules,
  activity_id text references public.activities,
  source text not null default 'manual',
  status text not null check (status in ('active', 'revoked')),
  expires_at timestamptz,
  check (num_nonnulls(topic_id, module_id, activity_id) = 1)
);
create table public.activity_progress (
  user_id uuid not null references auth.users on delete cascade,
  activity_id text not null references public.activities,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_id)
);
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  activity_id text not null references public.activities,
  submitted_answers jsonb not null,
  score numeric not null check (score between 0 and 100),
  passed boolean not null,
  started_at timestamptz not null,
  submitted_at timestamptz not null default now()
);
create table public.lab_progress (
  user_id uuid not null references auth.users on delete cascade,
  activity_id text not null references public.activities,
  completed_steps text[] not null default '{}',
  notes text not null default '',
  completed_at timestamptz,
  primary key (user_id, activity_id)
);
create index quiz_attempts_user_idx on public.quiz_attempts (user_id, submitted_at desc);
create index entitlements_user_idx on public.entitlements (user_id);

-- Milestone 1 exposes only catalogue cards. Activity payloads remain closed
-- until server-side access and progression checks ship.
alter table public.topics enable row level security;
revoke all on public.topics from public, anon, authenticated;
grant select on public.topics to authenticated;
create policy published_topics on public.topics for select to authenticated
  using (status = 'published' and access_level = 'free');

do $$
declare
  name text;
begin
  foreach name in array array['modules', 'chapters', 'activities', 'quiz_questions'] loop
    execute format('alter table public.%I enable row level security', name);
    execute format('revoke all on public.%I from public, anon, authenticated', name);
  end loop;
  foreach name in array array['profiles', 'enrollments', 'entitlements', 'activity_progress', 'quiz_attempts', 'lab_progress'] loop
    execute format('alter table public.%I enable row level security', name);
    execute format('revoke all on public.%I from public, anon, authenticated', name);
    execute format('grant select on public.%I to authenticated', name);
    execute format('create policy own_rows on public.%I for select to authenticated using ((select auth.uid()) = user_id)', name);
  end loop;
end $$;

alter table private.quiz_keys enable row level security;
alter table private.lab_solutions enable row level security;
revoke all on all tables in schema private from public, anon, authenticated;
