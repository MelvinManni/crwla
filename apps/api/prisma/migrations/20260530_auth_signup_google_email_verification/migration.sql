-- Self-serve signup + Google sign-in + email verification.
--
--   * `password_hash` becomes nullable so Google-only accounts (no local
--     password) are representable.
--   * `email_verified_at` gates protected routes — NULL means the account can
--     sign in but JwtAuthGuard rejects every guarded route until the user
--     confirms via the emailed link.
--   * `google_id` links an account to its Google OAuth identity.
--   * `email_verification_token` holds single-use, hashed, short-lived tokens.
--
-- Existing accounts predate verification, so they are backfilled as verified
-- (stamped with their creation time) to avoid locking anyone out.

ALTER TABLE "user" ALTER COLUMN "password_hash" DROP NOT NULL;

ALTER TABLE "user" ADD COLUMN "email_verified_at" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN "google_id" TEXT;

UPDATE "user" SET "email_verified_at" = "created_at" WHERE "email_verified_at" IS NULL;

CREATE UNIQUE INDEX "user_google_id_key" ON "user"("google_id");

-- CreateTable
CREATE TABLE "email_verification_token" (
  "id"         TEXT NOT NULL,
  "user_id"    TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "email_verification_token_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_verification_token_token_hash_key" ON "email_verification_token"("token_hash");
CREATE INDEX "email_verification_token_user_id_idx" ON "email_verification_token"("user_id");

ALTER TABLE "email_verification_token"
  ADD CONSTRAINT "email_verification_token_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
