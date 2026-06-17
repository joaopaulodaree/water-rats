-- ============================================================
-- Water Rats — initial schema
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text not null,
  avatar_url        text,
  account_created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read all"
  on public.profiles for select using (true);

create policy "profiles: insert own"
  on public.profiles for insert with check (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update using (auth.uid() = id);

-- Trigger: create profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── water_logs ───────────────────────────────────────────────
create table public.water_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  amount_ml  integer not null check (amount_ml > 0 and amount_ml <= 5000),
  photo_url  text,
  caption    text check (char_length(caption) <= 200),
  logged_at  timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.water_logs enable row level security;

create policy "water_logs: read all"
  on public.water_logs for select using (true);

create policy "water_logs: insert own"
  on public.water_logs for insert with check (auth.uid() = user_id);

create policy "water_logs: update own"
  on public.water_logs for update using (auth.uid() = user_id);

create policy "water_logs: delete own"
  on public.water_logs for delete using (auth.uid() = user_id);

-- ── reactions ────────────────────────────────────────────────
create table public.reactions (
  id         uuid primary key default gen_random_uuid(),
  log_id     uuid not null references public.water_logs(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (log_id, user_id)
);

alter table public.reactions enable row level security;

create policy "reactions: read all"
  on public.reactions for select using (true);

create policy "reactions: insert own"
  on public.reactions for insert with check (auth.uid() = user_id);

create policy "reactions: delete own"
  on public.reactions for delete using (auth.uid() = user_id);

-- ── achievements ─────────────────────────────────────────────
create table public.achievements (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text not null,
  icon             text not null,
  condition_type   text not null,  -- 'log_count' | 'total_ml' | 'streak_days'
  condition_value  integer not null
);

alter table public.achievements enable row level security;

create policy "achievements: read all"
  on public.achievements for select using (true);

-- ── user_achievements ────────────────────────────────────────
create table public.user_achievements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at      timestamptz not null default now(),
  unique (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

create policy "user_achievements: read all"
  on public.user_achievements for select using (true);

create policy "user_achievements: insert own"
  on public.user_achievements for insert with check (auth.uid() = user_id);

-- ── check_achievements function ──────────────────────────────
create or replace function public.check_achievements(
  p_user_id uuid,
  p_log_id  uuid
)
returns uuid[] language plpgsql security definer as $$
declare
  v_log_count   integer;
  v_total_ml    bigint;
  v_ach         record;
  v_new_ids     uuid[] := '{}';
begin
  select count(*)        into v_log_count from public.water_logs where user_id = p_user_id;
  select coalesce(sum(amount_ml), 0) into v_total_ml  from public.water_logs where user_id = p_user_id;

  for v_ach in
    select * from public.achievements
    where id not in (
      select achievement_id from public.user_achievements where user_id = p_user_id
    )
  loop
    if (v_ach.condition_type = 'log_count'  and v_log_count >= v_ach.condition_value) or
       (v_ach.condition_type = 'total_ml'   and v_total_ml  >= v_ach.condition_value)
    then
      insert into public.user_achievements (user_id, achievement_id)
      values (p_user_id, v_ach.id)
      on conflict do nothing;
      v_new_ids := array_append(v_new_ids, v_ach.id);
    end if;
  end loop;

  return v_new_ids;
end;
$$;

-- ── seed: achievements ───────────────────────────────────────
insert into public.achievements (name, description, icon, condition_type, condition_value) values
  ('Primeira Gota',      'Registrou a primeira água',              '💧', 'log_count', 1),
  ('Hidratado',          'Registrou 10 vezes',                     '🚿', 'log_count', 10),
  ('Rato D''Água',       'Registrou 50 vezes',                     '🐀', 'log_count', 50),
  ('Centenário',         'Registrou 100 vezes',                    '💯', 'log_count', 100),
  ('Litro Histórico',    'Bebeu 1 litro no total',                 '🏆', 'total_ml',  1000),
  ('10 Litros',          'Bebeu 10 litros no total',               '🌊', 'total_ml',  10000),
  ('100 Litros',         'Bebeu 100 litros no total',              '🌍', 'total_ml',  100000);
