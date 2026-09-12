-- CreateEnum
CREATE TYPE "StatusContaPagar" AS ENUM ('ABERTA', 'PARCIAL', 'PAGA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CategoriaDespesa" AS ENUM ('FORNECEDOR', 'ALUGUEL', 'ENERGIA', 'AGUA', 'INTERNET_TELEFONE', 'SALARIOS', 'IMPOSTOS', 'MANUTENCAO', 'TRANSPORTE', 'OUTROS');

-- CreateTable
CREATE TABLE "contas_pagar" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" "CategoriaDespesa" NOT NULL DEFAULT 'OUTROS',
    "fornecedorId" TEXT,
    "valorOriginal" DECIMAL(10,2) NOT NULL,
    "valorPago" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "saldo" DECIMAL(10,2) NOT NULL,
    "status" "StatusContaPagar" NOT NULL DEFAULT 'ABERTA',
    "vencimento" DATE NOT NULL,
    "observacoes" TEXT,
    "grupoRecorrencia" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos_conta_pagar" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "formaPagamento" "FormaPagamento" NOT NULL,
    "observacoes" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_conta_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contas_pagar_status_vencimento_idx" ON "contas_pagar"("status", "vencimento");

-- CreateIndex
CREATE INDEX "contas_pagar_vencimento_idx" ON "contas_pagar"("vencimento");

-- CreateIndex
CREATE INDEX "contas_pagar_fornecedorId_idx" ON "contas_pagar"("fornecedorId");

-- CreateIndex
CREATE INDEX "contas_pagar_grupoRecorrencia_idx" ON "contas_pagar"("grupoRecorrencia");

-- CreateIndex
CREATE INDEX "pagamentos_conta_pagar_contaId_idx" ON "pagamentos_conta_pagar"("contaId");

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_conta_pagar" ADD CONSTRAINT "pagamentos_conta_pagar_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "contas_pagar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_conta_pagar" ADD CONSTRAINT "pagamentos_conta_pagar_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
