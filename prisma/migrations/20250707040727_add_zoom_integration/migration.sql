-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN "zoomJoinUrl" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "zoomMeetingId" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "zoomPassword" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "zoomStartUrl" TEXT;

-- CreateTable
CREATE TABLE "ZoomCredentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "accountId" TEXT,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "tokenExpiry" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
