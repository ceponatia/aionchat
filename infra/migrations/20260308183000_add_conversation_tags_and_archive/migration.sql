ALTER TABLE "Conversation"
ADD COLUMN "archivedAt" TIMESTAMP(6);

CREATE TABLE "Tag" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#6b7280',
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationTag" (
  "conversationId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  CONSTRAINT "ConversationTag_pkey" PRIMARY KEY ("conversationId", "tagId")
);

CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

CREATE INDEX "ConversationTag_tagId_idx" ON "ConversationTag"("tagId");

ALTER TABLE "ConversationTag"
ADD CONSTRAINT "ConversationTag_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationTag"
ADD CONSTRAINT "ConversationTag_tagId_fkey"
FOREIGN KEY ("tagId") REFERENCES "Tag"("id")
ON DELETE CASCADE ON UPDATE CASCADE;