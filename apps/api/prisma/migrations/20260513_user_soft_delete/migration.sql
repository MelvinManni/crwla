-- Soft-delete column for user-initiated account deletions. `active=false`
-- alone could mean "admin deactivated"; `deleted_at` distinguishes a
-- self-deletion so audit + billing reconciliation can treat them apart.

ALTER TABLE "user" ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "user_deleted_at_idx" ON "user"("deleted_at");
