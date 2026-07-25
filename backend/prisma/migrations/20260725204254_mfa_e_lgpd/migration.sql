-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "bloqueadoAte" TIMESTAMP(3),
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaRecoveryCodesJson" TEXT,
ADD COLUMN     "mfaSecretCifrado" TEXT,
ADD COLUMN     "tentativasFalhas" INTEGER NOT NULL DEFAULT 0;
