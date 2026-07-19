-- CreateTable
CREATE TABLE "sessoes_catalogo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "nome" TEXT,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessoes_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_catalogo_codigo_key" ON "sessoes_catalogo"("codigo");
