-- Public-share fields on Search. `public_access` is the owner-controlled
-- gate; `share_slug` is the URL path component for /p/<slug>. The slug is
-- nullable so existing searches don't carry one until shared, but unique
-- when set so the public lookup is a single index hit.

ALTER TABLE "search"
  ADD COLUMN "public_access" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "share_slug" TEXT;

CREATE UNIQUE INDEX "search_share_slug_key" ON "search"("share_slug");
