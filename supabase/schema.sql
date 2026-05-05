-- RestoFlow — Schéma Supabase (PostgreSQL)
-- Exécuter dans le SQL editor du dashboard Supabase.

create extension if not exists "pgcrypto";

-- USERS (lié à auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  created_at timestamptz default now()
);

-- ESTABLISHMENTS
create table if not exists public.establishments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  city text not null,
  address text,
  cuisine_type text,
  positioning text,
  tone text,
  target_audience text,
  opening_days text[],
  hours text,
  specialties text,
  recurring_offers text,
  social_links jsonb,
  brand_guidelines text,
  created_at timestamptz default now()
);

create index if not exists establishments_user_idx on public.establishments(user_id);

-- WATCH_CONTEXTS
create table if not exists public.watch_contexts (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  generated_at timestamptz default now(),
  city text,
  national_trends text[],
  world_days jsonb,
  local_events jsonb,
  seasonality text,
  weather text,
  school_holidays text,
  commercial_events jsonb,
  sports_culture jsonb,
  summary text
);

-- QUESTIONNAIRES
create table if not exists public.questionnaires (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  watch_context_id uuid references public.watch_contexts(id) on delete set null,
  generated_at timestamptz default now(),
  questions jsonb not null
);

create table if not exists public.questionnaire_answers (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public.questionnaires(id) on delete cascade,
  answers jsonb not null,
  submitted_at timestamptz default now()
);

-- EDITORIAL CALENDARS
create table if not exists public.editorial_calendars (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  range text check (range in ('week','month')),
  start_date date,
  end_date date,
  post_ids uuid[],
  created_at timestamptz default now()
);

-- POSTS
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  date date not null,
  time text,
  objective text,
  format text,
  tone text,
  platforms text[],
  visual_idea text,
  image_prompt text,
  media_id uuid,
  status text default 'a-valider',
  comment text,
  created_at timestamptz default now(),
  scheduled_for timestamptz,
  published_at timestamptz
);

create index if not exists posts_est_date_idx on public.posts(establishment_id, date);

-- POST VERSIONS (one per platform)
create table if not exists public.post_versions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  platform text not null,
  text text,
  hashtags text[],
  call_to_action text
);

-- MEDIA FILES
create table if not exists public.media_files (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  url text not null,
  source text check (source in ('ai','upload')),
  prompt text,
  alt text,
  uploaded_at timestamptz default now()
);

-- VALIDATIONS
create table if not exists public.validations (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  comment text,
  decided_at timestamptz
);

-- PUBLICATION LOGS
create table if not exists public.publication_logs (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  platform text not null,
  status text check (status in ('scheduled','published','failed')),
  message text,
  at timestamptz default now()
);

-- PLATFORM ACCOUNTS
create table if not exists public.platform_accounts (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  platform text not null,
  connected boolean default false,
  handle text,
  connected_at timestamptz,
  unique(establishment_id, platform)
);

-- RLS
alter table public.users enable row level security;
alter table public.establishments enable row level security;
alter table public.watch_contexts enable row level security;
alter table public.questionnaires enable row level security;
alter table public.questionnaire_answers enable row level security;
alter table public.editorial_calendars enable row level security;
alter table public.posts enable row level security;
alter table public.post_versions enable row level security;
alter table public.media_files enable row level security;
alter table public.validations enable row level security;
alter table public.publication_logs enable row level security;
alter table public.platform_accounts enable row level security;

-- Helper to scope by establishment ownership
create or replace function public.owns_establishment(est_id uuid)
returns boolean
language sql stable as $$
  select exists(
    select 1 from public.establishments e
    where e.id = est_id and e.user_id = auth.uid()
  );
$$;

create policy users_self on public.users
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy est_owner on public.establishments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy watch_owner on public.watch_contexts
  for all using (public.owns_establishment(establishment_id));

create policy quiz_owner on public.questionnaires
  for all using (public.owns_establishment(establishment_id));

create policy quiz_ans_owner on public.questionnaire_answers
  for all using (
    exists(select 1 from public.questionnaires q
           where q.id = questionnaire_id and public.owns_establishment(q.establishment_id))
  );

create policy cal_owner on public.editorial_calendars
  for all using (public.owns_establishment(establishment_id));

create policy posts_owner on public.posts
  for all using (public.owns_establishment(establishment_id));

create policy postv_owner on public.post_versions
  for all using (
    exists(select 1 from public.posts p
           where p.id = post_id and public.owns_establishment(p.establishment_id))
  );

create policy media_owner on public.media_files
  for all using (public.owns_establishment(establishment_id));

create policy val_owner on public.validations
  for all using (
    exists(select 1 from public.posts p
           where p.id = post_id and public.owns_establishment(p.establishment_id))
  );

create policy publog_owner on public.publication_logs
  for all using (
    exists(select 1 from public.posts p
           where p.id = post_id and public.owns_establishment(p.establishment_id))
  );

create policy pa_owner on public.platform_accounts
  for all using (public.owns_establishment(establishment_id));

-- Storage bucket for media uploads
insert into storage.buckets (id, name, public) values ('media','media', true)
on conflict (id) do nothing;
