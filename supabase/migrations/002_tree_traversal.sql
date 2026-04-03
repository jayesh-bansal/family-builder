-- ============================================================
-- FAMILY BUILDER — SETUP MIGRATION (Run in Supabase SQL Editor)
--
-- This enables:
--   1. Full family tree traversal (see relatives' relatives)
--   2. "Declined" status for invitations
--   3. Primary/non-primary relationships (solid vs dotted lines)
--   4. Proper RLS for connected family viewing
--   5. Notification creation policy
--   6. Invitation access by token (for join page)
--
-- HOW TO RUN:
--   1. Go to https://supabase.com/dashboard → Your Project → SQL Editor
--   2. Paste this entire script
--   3. Click "Run"
--
-- Safe to run multiple times (idempotent).
-- ============================================================

-- ─────────────────────────────────────────────────────
-- 1. Add "declined" to invitation status constraint
-- ─────────────────────────────────────────────────────
alter table public.invitations
  drop constraint if exists invitations_status_check;

alter table public.invitations
  add constraint invitations_status_check
  check (status in ('pending', 'accepted', 'declined', 'expired'));

-- ─────────────────────────────────────────────────────
-- 2. Add is_primary column to relationships
--    Primary = the most significant relationship between a pair
--    Non-primary get shown as dotted lines in the tree view
-- ─────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────
-- 2b. Add social_links JSONB column to profiles
--     Stores: { instagram, facebook, twitter, linkedin, youtube, snapchat }
-- ─────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────
-- 3. Recursive function: get all relationships in a connected tree
--    Traverses the FULL graph starting from any user
--    DROP first to allow return-type changes on re-runs
-- ─────────────────────────────────────────────────────
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
  -- Base: the root user
  select root_user_id as uid
  union
  -- Single recursive term: traverse both directions at once
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

-- ─────────────────────────────────────────────────────
-- 4. Recursive function: get all profiles in a connected tree
--    DROP first to allow return-type changes on re-runs
-- ─────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────
-- 5. Update profile viewing policy
--    Allow viewing: own profile, public profiles,
--    profiles you created, and connected family members
-- ─────────────────────────────────────────────────────
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can view connected profiles" on public.profiles;

create policy "Users can view connected profiles"
  on public.profiles for select
  using (
    id = auth.uid()
    or tree_visibility = 'public'
    or created_by = auth.uid()
    or id in (
      select related_person_id from public.relationships
      where person_id = auth.uid()
    )
    or id in (
      select person_id from public.relationships
      where related_person_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────
-- 6. Add notification INSERT policy (was missing!)
-- ─────────────────────────────────────────────────────
drop policy if exists "Authenticated users can create notifications" on public.notifications;

create policy "Authenticated users can create notifications"
  on public.notifications for insert
  with check (auth.uid() is not null);

-- ─────────────────────────────────────────────────────
-- 7. Update invitation policies for join page access
--    Allow selecting by token (needed for unauthenticated join page)
--    Allow updating by anyone who can see it (for accept/decline)
-- ─────────────────────────────────────────────────────
drop policy if exists "Users can view their invitations" on public.invitations;
drop policy if exists "Users can view invitations by token or ownership" on public.invitations;

create policy "Users can view invitations by token or ownership"
  on public.invitations for select
  using (
    inviter_id = auth.uid()
    or email = auth.email()
    -- Token-based access is handled server-side via admin client
  );

drop policy if exists "Users can update invitations sent to them" on public.invitations;
drop policy if exists "Users can update invitations" on public.invitations;

create policy "Users can update invitations"
  on public.invitations for update
  using (
    inviter_id = auth.uid()
    or email = auth.email()
  );

-- ─────────────────────────────────────────────────────
-- 8. Update relationships policies
--    Direct access only — full tree traversal is handled by
--    get_family_tree() which uses SECURITY DEFINER to bypass RLS.
--    DO NOT self-reference relationships here (causes infinite recursion).
-- ─────────────────────────────────────────────────────
drop policy if exists "Users can view relationships they're part of" on public.relationships;
drop policy if exists "Users can view connected relationships" on public.relationships;

create policy "Users can view connected relationships"
  on public.relationships for select
  using (
    person_id = auth.uid()
    or related_person_id = auth.uid()
    or created_by = auth.uid()
  );

-- ─────────────────────────────────────────────────────
-- 9. Grant execute to authenticated users
-- ─────────────────────────────────────────────────────
grant execute on function public.get_family_tree(uuid) to authenticated;
grant execute on function public.get_tree_profiles(uuid) to authenticated;

-- ============================================================
-- Done! Family trees will now merge when members connect.
-- The tree view uses get_family_tree() for full graph traversal.
-- ============================================================
