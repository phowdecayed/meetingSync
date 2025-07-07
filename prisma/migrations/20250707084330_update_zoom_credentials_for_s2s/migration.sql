/*
  Warnings:

  - You are about to drop the column `apiKey` on the `ZoomCredentials` table. All the data in the column will be lost.
  - You are about to drop the column `apiSecret` on the `ZoomCredentials` table. All the data in the column will be lost.
  - Added the required column `clientId` to the `ZoomCredentials` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientSecret` to the `ZoomCredentials` table without a default value. This is not possible if the table is not empty.
  - Made the column `accountId` on table `ZoomCredentials` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ZoomCredentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ZoomCredentials" ("accountId", "createdAt", "id", "updatedAt") SELECT "accountId", "createdAt", "id", "updatedAt" FROM "ZoomCredentials";
DROP TABLE "ZoomCredentials";
ALTER TABLE "new_ZoomCredentials" RENAME TO "ZoomCredentials";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
