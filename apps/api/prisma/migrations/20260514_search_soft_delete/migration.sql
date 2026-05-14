ALTER TABLE "search" ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "search_deleted_at_idx" ON "search"("deleted_at");
