create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  created_at timestamptz default now()
);

create table if not exists match_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  persona_id text not null,
  topic_id text not null,
  ending text not null,
  logic_score int not null,
  evidence_score int not null,
  humanity_score int not null,
  humility_score int not null,
  summary text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table match_history enable row level security;

create policy "Users read their own profile"
on profiles
for select
using (auth.uid() = id);

create policy "Users upsert their own profile"
on profiles
for insert
with check (auth.uid() = id);

create policy "Users update their own profile"
on profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users read their own matches"
on match_history
for select
using (auth.uid() = user_id);

create policy "Users write their own matches"
on match_history
for insert
with check (auth.uid() = user_id);
