-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "appDescription" TEXT DEFAULT 'Efficiently manage and schedule your Zoom meetings.',
ADD COLUMN     "appName" TEXT NOT NULL DEFAULT 'MeetingSync';
