create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  whatsapp_number text not null unique,
  display_name text not null,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'paused', 'done', 'cancelled')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dashboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  snapshot_date date not null,
  calendar_events jsonb not null default '[]'::jsonb,
  tasks jsonb not null default '[]'::jsonb,
  reminders jsonb not null default '[]'::jsonb,
  memories jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, snapshot_date)
);

create table if not exists dashboard_actions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  action_date date not null,
  target_type text not null check (target_type in ('task', 'reminder')),
  target_id text,
  action text not null check (action in ('done', 'remove')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_profile_status_idx on goals(profile_id, status);
create index if not exists dashboard_snapshots_profile_date_idx on dashboard_snapshots(profile_id, snapshot_date);
create index if not exists dashboard_actions_profile_status_idx on dashboard_actions(profile_id, status, created_at);

alter table dashboard_snapshots add column if not exists reminders jsonb not null default '[]'::jsonb;
alter table dashboard_snapshots add column if not exists memories jsonb not null default '[]'::jsonb;

alter table profiles enable row level security;
alter table goals enable row level security;
alter table dashboard_snapshots enable row level security;
alter table dashboard_actions enable row level security;

revoke all on table profiles from anon, authenticated;
revoke all on table goals from anon, authenticated;
revoke all on table dashboard_snapshots from anon, authenticated;
revoke all on table dashboard_actions from anon, authenticated;

create policy profiles_deny_client_access on profiles for all to anon, authenticated using (false) with check (false);
create policy goals_deny_client_access on goals for all to anon, authenticated using (false) with check (false);
create policy dashboard_snapshots_deny_client_access on dashboard_snapshots for all to anon, authenticated using (false) with check (false);
create policy dashboard_actions_deny_client_access on dashboard_actions for all to anon, authenticated using (false) with check (false);
