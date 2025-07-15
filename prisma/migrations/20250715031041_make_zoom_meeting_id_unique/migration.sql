/*
  Warnings:

  - A unique constraint covering the columns `[zoomMeetingId]` on the table `Meeting` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Meeting_zoomMeetingId_key" ON "Meeting"("zoomMeetingId");
