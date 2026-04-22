-- Add line column and backfill existing users with a random line 1..6.
ALTER TABLE "User" ADD COLUMN "line" INTEGER NOT NULL DEFAULT 1;
UPDATE "User" SET "line" = FLOOR(RANDOM() * 6 + 1)::INT;
