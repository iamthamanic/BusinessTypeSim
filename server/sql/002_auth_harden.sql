-- Auth harden: verification, reset, refresh sessions, auth rate limits.
alter table users
  add column if not exists email_verified_at timestamptz;

create table if not exists verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists verification_tokens_user_idx
  on verification_tokens (user_id, created_at desc);

create table if not exists reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists reset_tokens_user_idx
  on reset_tokens (user_id, created_at desc);

create table if not exists refresh_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  rotated_from uuid references refresh_sessions(id) on delete set null,
  revoked_at timestamptz,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists refresh_sessions_user_idx
  on refresh_sessions (user_id, created_at desc);

create table if not exists auth_rate_windows (
  bucket_key text not null,
  window_key text not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (bucket_key, window_key)
);
