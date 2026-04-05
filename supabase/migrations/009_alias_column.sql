-- Migration 009: Add display_alias column to relationships table
-- Allows each user to set a personal nickname for any related member.
-- The alias is per-relationship-row, so each user has their own alias for the same person.

ALTER TABLE relationships ADD COLUMN IF NOT EXISTS display_alias text;
