-- AlterEnum
ALTER TYPE "CategoryStatus" ADD VALUE 'ARCHIVED';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Category_displayOrder_idx" ON "Category"("displayOrder");

-- CreateIndex
CREATE INDEX "Category_deletedAt_idx" ON "Category"("deletedAt");

-- CreateIndex
CREATE INDEX "Category_isFeatured_idx" ON "Category"("isFeatured");

-- CreateIndex
CREATE INDEX "Category_parentId_displayOrder_idx" ON "Category"("parentId", "displayOrder");
