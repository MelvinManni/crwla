-- Add User.disabledSourceCategories String[]
-- Empty array = all source categories enabled (default).
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "disabledSourceCategories" TEXT[] NOT NULL DEFAULT '{}';
