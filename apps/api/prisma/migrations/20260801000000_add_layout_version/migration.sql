-- CreateTable
CREATE TABLE "LayoutVersion" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "venueId" TEXT,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LayoutVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LayoutVersion_name_key" ON "LayoutVersion"("name");

-- CreateIndex
CREATE INDEX "LayoutVersion_name_idx" ON "LayoutVersion"("name");
