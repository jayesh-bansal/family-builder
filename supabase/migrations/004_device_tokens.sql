-- Migration 004: Device tokens for push notifications (mobile app)
-- Run this in Supabase SQL Editor after deploying the mobile app.

create table if not exists public.device_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz default now(),
  unique(user_id, token)
);

-- RLS: users can only manage their own device tokens
alter table public.device_tokens enable row level security;

create policy "Users can view own tokens"
  on public.device_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert own tokens"
  on public.device_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own tokens"
  on public.device_tokens for delete
  using (auth.uid() = user_id);

-- Index for fast lookup when sending push notifications
create index if not exists idx_device_tokens_user_id on public.device_tokens(user_id);
