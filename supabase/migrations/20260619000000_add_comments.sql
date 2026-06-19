-- ============================================================
-- Add comments table
-- ============================================================

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  log_id     uuid not null references public.water_logs(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) <= 200),
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy "comments: read all"
  on public.comments for select using (true);

create policy "comments: insert own"
  on public.comments for insert with check (auth.uid() = user_id);

create policy "comments: delete own"
  on public.comments for delete using (auth.uid() = user_id);
