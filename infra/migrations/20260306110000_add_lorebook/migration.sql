-- CreateTable
CREATE TABLE "LoreEntry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "body" TEXT NOT NULL,
    "activationHints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LoreEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationLoreEntry" (
    "conversationId" TEXT NOT NULL,
    "loreEntryId" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ConversationLoreEntry_pkey" PRIMARY KEY ("conversationId", "loreEntryId")
);

-- CreateIndex
CREATE INDEX "ConversationLoreEntry_loreEntryId_idx" ON "ConversationLoreEntry"("loreEntryId");

-- CreateIndex
CREATE INDEX "ConversationLoreEntry_conversationId_priority_idx" ON "ConversationLoreEntry"("conversationId", "priority");

-- AddForeignKey
ALTER TABLE "ConversationLoreEntry" ADD CONSTRAINT "ConversationLoreEntry_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationLoreEntry" ADD CONSTRAINT "ConversationLoreEntry_loreEntryId_fkey" FOREIGN KEY ("loreEntryId") REFERENCES "LoreEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;