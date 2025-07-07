-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allowRegistration" BOOLEAN NOT NULL DEFAULT true,
    "defaultRole" TEXT NOT NULL DEFAULT 'member',
    "updatedAt" DATETIME NOT NULL
);
