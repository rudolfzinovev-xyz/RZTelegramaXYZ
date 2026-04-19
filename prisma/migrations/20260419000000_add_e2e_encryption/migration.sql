-- E2E encryption: per-user keypairs + per-message nonces
ALTER TABLE "User" ADD COLUMN "publicKey" TEXT;
ALTER TABLE "User" ADD COLUMN "encryptedPrivateKey" TEXT;
ALTER TABLE "User" ADD COLUMN "privateKeyNonce" TEXT;
ALTER TABLE "User" ADD COLUMN "privateKeySalt" TEXT;

ALTER TABLE "Message" ADD COLUMN "nonce" TEXT;
