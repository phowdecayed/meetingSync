/*
  Warnings:

  - A unique constraint covering the columns `[clientId]` on the table `ZoomCredentials` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "zoomCredentialId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ZoomCredentials_clientId_key" ON "ZoomCredentials"("clientId");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_zoomCredentialId_fkey" FOREIGN KEY ("zoomCredentialId") REFERENCES "ZoomCredentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
