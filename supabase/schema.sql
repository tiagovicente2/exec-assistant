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

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  remind_at timestamptz not null,
  timezone text not null default 'America/Sao_Paulo',
  status text not null default 'scheduled' check (status in ('scheduled', 'sent', 'cancelled')),
  recurrence_rule text,
  source_message_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  kind text not null default 'preference',
  content text not null,
  importance integer not null default 3 check (importance >= 1 and importance <= 5),
  source_message_id text,
  created_at timestamptz not null default now()
);

create table if not exists conversation_messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  whatsapp_message_id text,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists google_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  access_token_encrypted text,
  refresh_token_encrypted text not null,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_profile_status_idx on goals(profile_id, status);
create index if not exists reminders_due_idx on reminders(profile_id, status, remind_at);
create index if not exists memories_profile_kind_idx on memories(profile_id, kind);
