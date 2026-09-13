-- Self-hosted schema for users and game runs.
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists game_runs (
  id text primary key,
  owner_id uuid not null references users(id) on delete cascade,
  scenario_id text not null,
  scenario_version integer not null,
  seed text not null,
  revision integer not null default 1,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_runs_owner_updated_idx
  on game_runs (owner_id, updated_at desc);

create table if not exists ai_usage_windows (
  owner_id uuid not null references users(id) on delete cascade,
  window_key text not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (owner_id, window_key)
);
