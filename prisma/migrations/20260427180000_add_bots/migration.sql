-- Allow null password for bots (no password login)
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Bot fields on User
ALTER TABLE "User" ADD COLUMN "isBot" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "botOwnerId" TEXT;

ALTER TABLE "User" ADD CONSTRAINT "User_botOwnerId_fkey"
  FOREIGN KEY ("botOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- BotToken
CREATE TABLE "BotToken" (
  "id" TEXT NOT NULL,
  "botId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BotToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BotToken_botId_key" ON "BotToken"("botId");
CREATE UNIQUE INDEX "BotToken_token_key" ON "BotToken"("token");
CREATE INDEX "BotToken_token_idx" ON "BotToken"("token");

ALTER TABLE "BotToken" ADD CONSTRAINT "BotToken_botId_fkey"
  FOREIGN KEY ("botId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
