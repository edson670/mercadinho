-- AlterTable
ALTER TABLE "configuracoes" ADD COLUMN     "chavePix" TEXT;

-- CreateIndex
CREATE INDEX "sessoes_catalogo_telefone_expiraEm_idx" ON "sessoes_catalogo"("telefone", "expiraEm");

-- CreateIndex
CREATE INDEX "sessoes_catalogo_expiraEm_idx" ON "sessoes_catalogo"("expiraEm");
