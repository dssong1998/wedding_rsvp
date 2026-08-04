-- LayoutVersion: single file key → version folder prefix
ALTER TABLE "LayoutVersion" RENAME COLUMN "s3Key" TO "s3Prefix";

UPDATE "LayoutVersion"
SET "s3Prefix" = regexp_replace("s3Prefix", '\.json$', '/')
WHERE "s3Prefix" LIKE '%.json';

-- History snapshots (date/time paths under each version folder)
CREATE TABLE "LayoutVersionHistory" (
    "id" SERIAL NOT NULL,
    "versionId" INTEGER NOT NULL,
    "s3Key" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT,

    CONSTRAINT "LayoutVersionHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LayoutVersionHistory_s3Key_key" ON "LayoutVersionHistory"("s3Key");

CREATE INDEX "LayoutVersionHistory_versionId_savedAt_idx" ON "LayoutVersionHistory"("versionId", "savedAt");

ALTER TABLE "LayoutVersionHistory" ADD CONSTRAINT "LayoutVersionHistory_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "LayoutVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
