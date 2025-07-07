-- AlterTable
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ZoomCredentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "hostKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ZoomCredentials" ("id", "clientId", "clientSecret", "accountId", "createdAt", "updatedAt") SELECT "id", "clientId", "clientSecret", "accountId", "createdAt", "updatedAt" FROM "ZoomCredentials";
DROP TABLE "ZoomCredentials";
ALTER TABLE "new_ZoomCredentials" RENAME TO "ZoomCredentials";
PRAGMA foreign_keys=ON; 