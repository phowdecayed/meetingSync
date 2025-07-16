-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "isZoomMeeting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "meetingType" TEXT NOT NULL DEFAULT 'external';
