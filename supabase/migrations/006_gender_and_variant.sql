-- ============================================================
-- FAMILY BUILDER — Migration 006: Gender & Family Variant
--
-- This enables:
--   1. Gender field on profiles (required for Indian variant relations)
--   2. Family variant setting (global / indian)
--
-- HOW TO RUN:
--   1. Go to https://supabase.com/dashboard → Your Project → SQL Editor
--   2. Paste this entire script
--   3. Click "Run"
--
-- Safe to run multiple times (idempotent).
-- ============================================================

-- ─────────────────────────────────────────────────────
-- 1. Add gender column to profiles
-- ─────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'gender'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN gender text
      CHECK (gender IN ('male', 'female', 'other'));
    RAISE NOTICE 'Added gender column to profiles';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────
-- 2. Add family_variant column to profiles
--    Defaults to 'global' for existing users
-- ─────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'family_variant'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN family_variant text DEFAULT 'global'
      CHECK (family_variant IN ('global', 'indian'));
    RAISE NOTICE 'Added family_variant column to profiles';
  END IF;
END $$;

-- ============================================================
-- Done! Gender and family variant are now available on profiles.
-- ============================================================
