ALTER TABLE "Conversation"
ADD COLUMN "summaryInvalidatedAt" TIMESTAMPTZ(6),
ADD COLUMN "summaryRefreshError" TEXT;

CREATE TABLE "ConversationSummary" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sourceMessageId" TEXT NOT NULL,
    "coveredMessageCount" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "stateSnapshot" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ConversationSummary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConversationSummary_conversationId_key" ON "ConversationSummary"("conversationId");

ALTER TABLE "ConversationSummary"
ADD CONSTRAINT "ConversationSummary_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;