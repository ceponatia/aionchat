-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "characterSheetId" TEXT,
ADD COLUMN     "systemPrompt" TEXT;

-- CreateTable
CREATE TABLE "CharacterSheet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "personality" TEXT,
    "background" TEXT,
    "appearance" TEXT,
    "scenario" TEXT,
    "customInstructions" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CharacterSheet_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_characterSheetId_fkey" FOREIGN KEY ("characterSheetId") REFERENCES "CharacterSheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
