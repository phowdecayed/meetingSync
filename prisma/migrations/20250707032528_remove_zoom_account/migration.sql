/*
  Warnings:

  - You are about to drop the `ZoomAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `zoomAccountId` on the `Meeting` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ZoomAccount_email_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ZoomAccount";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Meeting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "duration" INTEGER NOT NULL,
    "participants" TEXT NOT NULL,
    "description" TEXT,
    "organizerId" TEXT NOT NULL,
    CONSTRAINT "Meeting_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Meeting" ("date", "description", "duration", "id", "organizerId", "participants", "title") SELECT "date", "description", "duration", "id", "organizerId", "participants", "title" FROM "Meeting";
DROP TABLE "Meeting";
ALTER TABLE "new_Meeting" RENAME TO "Meeting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
