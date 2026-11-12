/*
  Warnings:

  - You are about to drop the column `imagePath` on the `collections` table. All the data in the column will be lost.
  - The `displayLocation` column on the `collections` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "CollectionDisplayLocation" AS ENUM ('HOME_GRID', 'STOREFRONT_CATALOG', 'BANNER', 'SIDEBAR');

-- DropIndex
DROP INDEX "collections_status_displayLocation_idx";

-- AlterTable
ALTER TABLE "collections" DROP COLUMN "imagePath",
ADD COLUMN     "imageUrl" TEXT,
ALTER COLUMN "slug" SET DATA TYPE TEXT,
DROP COLUMN "displayLocation",
ADD COLUMN     "displayLocation" "CollectionDisplayLocation" NOT NULL DEFAULT 'STOREFRONT_CATALOG',
ALTER COLUMN "badgeText" SET DATA TYPE TEXT;

-- DropEnum
DROP TYPE "DisplayLocation";
