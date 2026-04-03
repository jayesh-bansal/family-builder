-- ============================================================
-- Migration 003: Social Links + Primary Relationships
--
-- Run this in Supabase SQL Editor if you've already run 002.
-- Adds:
--   1. social_links JSONB column to profiles
--   2. is_primary boolean column to relationships
--
-- Safe to run multiple times (idempotent).
-- ============================================================

-- 1. Add social_links to profiles
--    Stores: { instagram, facebook, twitter, linkedin, youtube, snapchat }
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'social_links'
  ) then
    alter table public.profiles add column social_links jsonb default null;
  end if;
end $$;

-- 2. Add is_primary to relationships
--    Primary = the closest/most meaningful relationship between a pair
--    Non-primary relationships show as dotted lines in the tree view
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'relationships'
      and column_name = 'is_primary'
  ) then
    alter table public.relationships add column is_primary boolean default true;
  end if;
end $$;

-- 3. Recreate get_family_tree to include is_primary in return type
drop function if exists public.get_family_tree(uuid);

create or replace function public.get_family_tree(root_user_id uuid)
returns table (
  id uuid,
  person_id uuid,
  related_person_id uuid,
  relationship_type text,
  is_confirmed boolean,
  is_primary boolean,
  created_by uuid,
  created_at timestamptz
) as $$
with recursive reachable as (
  select root_user_id as uid
  union
  select
    case when r.person_id = re.uid then r.related_person_id else r.person_id end as uid
  from public.relationships r
  inner join reachable re
    on r.person_id = re.uid or r.related_person_id = re.uid
  where case when r.person_id = re.uid then r.related_person_id else r.person_id end != re.uid
)
select
  r.id,
  r.person_id,
  r.related_person_id,
  r.relationship_type,
  r.is_confirmed,
  r.is_primary,
  r.created_by,
  r.created_at
from public.relationships r
where r.person_id in (select uid from reachable)
   or r.related_person_id in (select uid from reachable);
$$ language sql security definer stable;

-- 4. Recreate get_tree_profiles (profiles table changed, need fresh definition)
drop function if exists public.get_tree_profiles(uuid);

create or replace function public.get_tree_profiles(root_user_id uuid)
returns setof public.profiles as $$
with recursive reachable as (
  select root_user_id as uid
  union
  select
    case when r.person_id = re.uid then r.related_person_id else r.person_id end as uid
  from public.relationships r
  inner join reachable re
    on r.person_id = re.uid or r.related_person_id = re.uid
  where case when r.person_id = re.uid then r.related_person_id else r.person_id end != re.uid
)
select p.*
from public.profiles p
where p.id in (select uid from reachable);
$$ language sql security definer stable;

grant execute on function public.get_family_tree(uuid) to authenticated;
grant execute on function public.get_tree_profiles(uuid) to authenticated;

-- ============================================================
-- Done! Social links and primary/secondary relationships are now active.
-- ============================================================
