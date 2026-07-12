# 04 — Modelagem de Dados

Schema completo em [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma).
Banco: **PostgreSQL**. Chaves primárias em **UUID**. Valores monetários em `Decimal(10,2)`; quantidades em `Decimal(10,3)` (suporte a KG/L fracionados).

## Entidades e relacionamentos

| Entidade | Descrição | Principais relações |
|----------|-----------|---------------------|
| **Usuario** | Operadores do sistema | 1—N Vendas, Compras, Caixas, Movimentações, Auditorias |
| **RefreshToken** | Controle de sessão / renovação de JWT | N—1 Usuario |
| **Cliente** | Clientes do mercadinho | 1—N Vendas, 1—N Fiados |
| **Categoria** | Agrupamento de produtos | 1—N Produtos |
| **Produto** | Itens vendáveis | N—1 Categoria; 1—N ItensVenda/ItensCompra/Movimentações |
| **MovimentacaoEstoque** | Log imutável de entradas/saídas/ajustes | N—1 Produto, N—1 Usuario |
| **Fornecedor** | Fornecedores | 1—N Compras |
| **Compra** | Compra a fornecedor | N—1 Fornecedor, N—1 Usuario, 1—N ItemCompra |
| **ItemCompra** | Linha de uma compra | N—1 Compra, N—1 Produto |
| **VendaModel** (`vendas`) | Venda no PDV | N—1 Cliente/Usuario/Caixa, 1—N ItemVenda, 1—1 Fiado |
| **ItemVenda** | Linha de uma venda | N—1 Venda, N—1 Produto |
| **Fiado** | Dívida do cliente (venda a prazo) | N—1 Cliente, 1—1 Venda, 1—N PagamentoFiado |
| **PagamentoFiado** | Pagamento de um fiado | N—1 Fiado, N—1 Usuario |
| **Caixa** | Sessão de caixa (abertura→fechamento) | N—1 Usuario, 1—N Vendas, 1—N MovimentacaoCaixa |
| **MovimentacaoCaixa** | Sangria / suprimento | N—1 Caixa, N—1 Usuario |
| **Auditoria** | Trilha de ações | N—1 Usuario |
| **Configuracao** | Dados da empresa (registro único) | — |

## Dicionário de dados (campos-chave)

### Produto
| Campo | Tipo | Notas |
|-------|------|-------|
| precoCompra / precoVenda | Decimal(10,2) | margem = venda − compra |
| estoque | Decimal(10,3) | atualizado só via MovimentacaoEstoque |
| estoqueMinimo | Decimal(10,3) | dispara alerta quando `estoque <= estoqueMinimo` |
| unidade | enum Unidade | UN, KG, L, CX, PCT |
| ativo | boolean | soft delete |

### VendaModel
| Campo | Tipo | Notas |
|-------|------|-------|
| numero | int autoincrement | identificador amigável |
| subtotal / desconto / total | Decimal(10,2) | `total = subtotal − desconto` |
| formaPagamento | enum | DINHEIRO, PIX, CARTAO, FIADO |
| caixaId | FK | venda sempre vinculada a um caixa aberto |

### Fiado
| Campo | Tipo | Notas |
|-------|------|-------|
| valorOriginal | Decimal | valor total da dívida |
| valorPago | Decimal | soma dos pagamentos |
| saldo | Decimal | `valorOriginal − valorPago` |
| status | enum | ABERTO → PARCIAL → QUITADO |

### Caixa
| Campo | Tipo | Notas |
|-------|------|-------|
| status | enum | ABERTO / FECHADO |
| valorAbertura / valorFechamento | Decimal | conferência de caixa |
| totalVendas/Sangrias/Suprimentos | Decimal | consolidados no fechamento |

## Regras de integridade e invariantes

1. **Estoque nunca é editado diretamente** — toda alteração cria uma `MovimentacaoEstoque` e recalcula `Produto.estoque` na mesma transação.
2. **Venda com pagamento FIADO** exige `clienteId` e gera um registro `Fiado` com `saldo = total`.
3. **Não é possível vender** com estoque insuficiente (produto controlado) → `EstoqueInsuficienteError`.
4. **Venda só é permitida com caixa ABERTO**; ao registrar, vincula-se ao caixa do operador.
5. **Pagamento de fiado** atualiza `valorPago`, recalcula `saldo` e ajusta `status`; nunca ultrapassa `valorOriginal`.
6. **Fechamento de caixa** consolida totais e impede novas vendas naquele caixa.
7. **Soft delete** (`ativo`) preserva histórico; entidades inativas não aparecem em seleções do PDV.
8. **Cancelamento de venda** gera movimentações de estoque de estorno (origem `CANCELAMENTO`) e status `CANCELADA`.

## Seed inicial

- 1 usuário **Administrador** padrão.
- Registro único de **Configuracao** (empresa).
- Categorias básicas (ex.: Bebidas, Mercearia, Limpeza, Hortifruti).
