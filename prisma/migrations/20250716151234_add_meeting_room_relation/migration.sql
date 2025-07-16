-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "meetingRoomId" TEXT;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_meetingRoomId_fkey" FOREIGN KEY ("meetingRoomId") REFERENCES "MeetingRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
