-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('RECEBIDO', 'EM_SEPARACAO', 'SAIU_PARA_ENTREGA', 'ENTREGUE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "OrigemPedido" AS ENUM ('WHATSAPP');

-- CreateEnum
CREATE TYPE "FormaPagamentoPedido" AS ENUM ('PIX', 'DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO');

-- CreateEnum
CREATE TYPE "DirecaoMensagem" AS ENUM ('RECEBIDA', 'ENVIADA');

-- CreateEnum
CREATE TYPE "StatusEnvioMensagem" AS ENUM ('PENDENTE', 'ENVIADA', 'FALHOU');

-- AlterEnum
ALTER TYPE "OrigemMovimentacao" ADD VALUE 'PEDIDO_WHATSAPP';

-- DropForeignKey
ALTER TABLE "movimentacoes_estoque" DROP CONSTRAINT "movimentacoes_estoque_usuarioId_fkey";

-- AlterTable
ALTER TABLE "movimentacoes_estoque" ALTER COLUMN "usuarioId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "descricao" TEXT,
ADD COLUMN     "imagemUrl" TEXT,
ADD COLUMN     "precoPromocional" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "trackingToken" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "clienteId" TEXT,
    "nomeCliente" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numeroEndereco" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "referencia" TEXT,
    "formaPagamento" "FormaPagamentoPedido" NOT NULL,
    "trocoPara" DECIMAL(10,2),
    "subtotal" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "status" "StatusPedido" NOT NULL DEFAULT 'RECEBIDO',
    "origem" "OrigemPedido" NOT NULL DEFAULT 'WHATSAPP',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_pedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "nomeProduto" TEXT NOT NULL,
    "quantidade" DECIMAL(10,3) NOT NULL,
    "precoUnitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "itens_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_status_pedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "status" "StatusPedido" NOT NULL,
    "usuarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_status_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens_whatsapp" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT,
    "telefone" TEXT NOT NULL,
    "direcao" "DirecaoMensagem" NOT NULL,
    "conteudo" TEXT NOT NULL,
    "statusEnvio" "StatusEnvioMensagem" NOT NULL DEFAULT 'PENDENTE',
    "erro" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_trackingToken_key" ON "pedidos"("trackingToken");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_idempotencyKey_key" ON "pedidos"("idempotencyKey");

-- CreateIndex
CREATE INDEX "pedidos_status_idx" ON "pedidos"("status");

-- CreateIndex
CREATE INDEX "pedidos_telefone_idx" ON "pedidos"("telefone");

-- CreateIndex
CREATE INDEX "pedidos_criadoEm_idx" ON "pedidos"("criadoEm");

-- CreateIndex
CREATE INDEX "itens_pedido_pedidoId_idx" ON "itens_pedido"("pedidoId");

-- CreateIndex
CREATE INDEX "historico_status_pedido_pedidoId_idx" ON "historico_status_pedido"("pedidoId");

-- CreateIndex
CREATE INDEX "mensagens_whatsapp_telefone_idx" ON "mensagens_whatsapp"("telefone");

-- CreateIndex
CREATE INDEX "mensagens_whatsapp_pedidoId_idx" ON "mensagens_whatsapp"("pedidoId");

-- CreateIndex
CREATE INDEX "mensagens_whatsapp_statusEnvio_idx" ON "mensagens_whatsapp"("statusEnvio");

-- CreateIndex
CREATE INDEX "clientes_telefone_idx" ON "clientes"("telefone");

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status_pedido" ADD CONSTRAINT "historico_status_pedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status_pedido" ADD CONSTRAINT "historico_status_pedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_whatsapp" ADD CONSTRAINT "mensagens_whatsapp_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
