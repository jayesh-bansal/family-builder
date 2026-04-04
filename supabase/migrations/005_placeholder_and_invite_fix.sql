-- ============================================================
-- FAMILY BUILDER — Migration 005: Fix placeholders & invitations
--
-- This enables:
--   1. Placeholder profiles (drop FK to auth.users)
--   2. Phone-based invitations (add phone column, make email nullable)
--
-- HOW TO RUN:
--   1. Go to https://supabase.com/dashboard → Your Project → SQL Editor
--   2. Paste this entire script
--   3. Click "Run"
--
-- Safe to run multiple times (idempotent).
-- ============================================================

-- ─────────────────────────────────────────────────────
-- 1. Drop foreign key from profiles.id → auth.users
--    This allows placeholder profiles with random UUIDs
--    that don't exist in auth.users
-- ─────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'profiles_id_fkey'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
    RAISE NOTICE 'Dropped profiles_id_fkey constraint';
  ELSE
    RAISE NOTICE 'profiles_id_fkey constraint does not exist, skipping';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────
-- 2. Make email nullable on invitations (for phone-only invites)
-- ─────────────────────────────────────────────────────
ALTER TABLE public.invitations ALTER COLUMN email DROP NOT NULL;

-- ─────────────────────────────────────────────────────
-- 3. Add phone column to invitations
-- ─────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invitations'
      AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.invitations ADD COLUMN phone text;
    RAISE NOTICE 'Added phone column to invitations';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────
-- 4. Ensure created_by FK on profiles doesn't block
--    placeholder creation (drop the self-referencing FK)
-- ─────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'profiles_created_by_fkey'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_created_by_fkey;
    RAISE NOTICE 'Dropped profiles_created_by_fkey constraint';
  ELSE
    RAISE NOTICE 'profiles_created_by_fkey constraint does not exist, skipping';
  END IF;
END $$;

-- ============================================================
-- Done! Placeholder profiles and phone invitations are now supported.
-- ============================================================
