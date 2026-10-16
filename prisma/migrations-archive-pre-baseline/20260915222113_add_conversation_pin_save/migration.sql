-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "saved" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_pinned_idx" ON "ConversationParticipant"("userId", "pinned");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_saved_idx" ON "ConversationParticipant"("userId", "saved");
