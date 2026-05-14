-- Per-row favorite marker on Result. Timestamp (not boolean) so a
-- future "recent favorites" tab can sort by it. NULL == not favorited.

ALTER TABLE "result" ADD COLUMN "favorited_at" TIMESTAMP(3);

CREATE INDEX "result_search_id_favorited_at_idx"
  ON "result"("search_id", "favorited_at" DESC);
