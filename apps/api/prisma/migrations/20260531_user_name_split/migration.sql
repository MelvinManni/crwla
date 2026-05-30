-- Split User.name into first_name (required) + last_name (optional).
--
-- Existing rows are migrated by splitting on the first run of whitespace:
-- token 1 -> first_name, the remainder -> last_name (NULL when absent).
-- Rows whose name was empty/whitespace fall back to the email local-part so
-- first_name is never blank before the NOT NULL constraint lands.

ALTER TABLE "user" ADD COLUMN "first_name" TEXT;
ALTER TABLE "user" ADD COLUMN "last_name" TEXT;

UPDATE "user" SET
  "first_name" = NULLIF(trim(split_part("name", ' ', 1)), ''),
  "last_name" = NULLIF(trim(substr("name", length(split_part("name", ' ', 1)) + 2)), '');

UPDATE "user"
  SET "first_name" = split_part("email", '@', 1)
  WHERE "first_name" IS NULL OR "first_name" = '';

ALTER TABLE "user" ALTER COLUMN "first_name" SET NOT NULL;

ALTER TABLE "user" DROP COLUMN "name";
