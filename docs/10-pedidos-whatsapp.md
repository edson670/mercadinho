# 10 — Módulo Pedidos WhatsApp (Evolution API)

> **Status:** proposta de arquitetura para aprovação. Nenhum código implementado ainda.

## Visão geral

Permitir que o cliente faça um pedido completo pelo WhatsApp sem atendente humano:

```
Cliente (WhatsApp) ──"Olá"──▶ Evolution API ──webhook──▶ Backend (NestJS)
                                                              │
                    ◀── link do catálogo ─────────────────────┘
Cliente (navegador) ──▶ Catálogo web (React, público, mobile-first)
                              │ POST /public/orders
                              ▼
                    Backend: valida estoque → baixa estoque → cria Pedido
                              │                    │
              WhatsApp: "Pedido Nº 154 recebido"   ▼
                              PDV: tela "Pedidos WhatsApp" (Socket.IO, tempo real)
                              │ operador muda status
                              ▼
              WhatsApp: "Em separação" / "Saiu para entrega" / "Entregue"
```

## Decisões de arquitetura (ADRs)

### A1 — Pedido é um agregado próprio, separado de Venda
`Pedido` (WhatsApp/delivery) tem ciclo de vida diferente de `VendaModel` (PDV presencial):
status em etapas, endereço de entrega, troco, sem caixa vinculado. Misturar os dois
poluiria o PDV. Relatórios podem consolidar depois. O campo `origem` já nasce como enum
para permitir futuras origens (site, iFood, etc.).

### A2 — Estoque: baixa imediata na criação, estorno no cancelamento
A especificação pede "reserva de estoque". Avaliei duas opções:

| Opção | Prós | Contras |
|---|---|---|
| Reserva com TTL (tabela ReservaEstoque) | Estoque só sai quando confirmado | Exige job de expiração, 2 fases, corrida entre reserva e baixa |
| **Baixa imediata + estorno no cancelamento** ✅ | Reusa `StockService.applyMovement` (transacional, já testado); simples e sem jobs | Pedido cancelado "segurou" estoque por alguns minutos |

Para um mercadinho, a baixa imediata é mais segura (nunca vende o que não tem) e reusa o
event-log de estoque existente com origem nova `PEDIDO_WHATSAPP` / `CANCELAMENTO`.
A tabela `ReservaEstoque` fica como evolução futura se surgir necessidade real.

### A3 — Endereço embutido no Pedido (snapshot), não tabela separada
O endereço do pedido é um **registro histórico da entrega** — se o cliente mudar de
endereço amanhã, o pedido de hoje não pode mudar. Campos embutidos no `Pedido`.
O último endereço é copiado para o cadastro do `Cliente` para pré-preencher a próxima compra.

### A4 — Catálogo público como rotas novas no frontend existente
O app React já tem code-splitting por rota. O catálogo entra como `/catalogo` e
`/catalogo/checkout` (públicas, sem login), chunk separado, mobile-first. Zero novo deploy.
Endpoints públicos dedicados (`/public/...`) com **rate limit próprio e payload mínimo**
(nunca expõem preço de compra, estoque exato vira "disponível/últimas unidades/esgotado").

### A5 — Evolution API atrás de uma interface (porta e adaptador)
`IWhatsAppGateway` (domínio) ⇢ `EvolutionWhatsAppAdapter` (infra). Troca de provedor
(Cloud API oficial, Baileys, etc.) sem tocar nos use cases. Webhook validado por token.
Envio de mensagens **assíncrono e tolerante a falha**: se o WhatsApp cair, o pedido é
criado mesmo assim e a mensagem fica registrada como `FALHOU` para reenvio.

### A6 — Estado da conversa: mínimo necessário
Como o checkout acontece **no catálogo web** (dados coletados por formulário, não por
chat), o bot de WhatsApp precisa de pouquíssimo estado: qualquer mensagem recebida de
número desconhecido/sem pedido ativo → responde saudação + link do catálogo (com telefone
pré-vinculado via token curto). Isso elimina a máquina de estados de conversa — o maior
ponto de fragilidade de bots de pedido por chat.

### A7 — Tempo real com Socket.IO
Gateway NestJS (`@nestjs/websockets` + Socket.IO) emite `pedido:novo` e
`pedido:status` para a tela do PDV. Frontend usa `socket.io-client` + invalidação do
TanStack Query. Autenticação do socket via JWT existente.

### A8 — Impressão
Recibo gerado como **PDF 80mm** reutilizando o `PdfExportService` (nova definição de
documento térmico) — imprime em qualquer impressora via diálogo do navegador/spooler.
Integração ESC/POS direto na térmica fica como melhoria futura (exige agente local).

### A9 — Multitenant: preparado, não implementado
Nada no design impede multi-loja (ids UUID, configuração isolada, gateway por instância
Evolution). Implementar de fato (tabela Loja + lojaId em tudo + resolução por domínio)
é um épico próprio; não entra neste módulo.

## Modelagem de dados (novas tabelas)

- **Pedido** — numero sequencial, cliente (FK opcional + snapshot nome/telefone), endereço
  embutido, forma de pagamento (PIX/DINHEIRO/CARTAO_CREDITO/CARTAO_DEBITO), trocoPara,
  subtotal/total, status (RECEBIDO → EM_SEPARACAO → SAIU_PARA_ENTREGA → ENTREGUE | CANCELADO),
  origem (WHATSAPP), observações, timestamps.
- **ItemPedido** — snapshot de nome e preço do produto no momento do pedido.
- **HistoricoStatusPedido** — trilha de mudanças (status, usuário, data).
- **MensagemWhatsApp** — log de toda mensagem enviada/recebida (direção, conteúdo,
  status de envio, pedido vinculado) para auditoria e reenvio.

Clientes reusam a tabela `Cliente` existente (cadastro automático pelo telefone).

## Contrato de API (resumo)

| Endpoint | Auth | Descrição |
|---|---|---|
| `GET /public/catalog/products?search=&categoriaId=&page=` | pública + rate limit | catálogo (sem dados sensíveis) |
| `GET /public/catalog/categories` | pública | categorias ativas |
| `POST /public/orders` | pública + rate limit + idempotência | cria pedido (payload cliente/endereço/pagamento/itens) |
| `GET /public/orders/:id/status?t=<token>` | pública c/ token | acompanhamento pelo cliente |
| `POST /webhooks/evolution` | token secreto | mensagens recebidas do WhatsApp |
| `GET /orders` `GET /orders/:id` | JWT | listagem/detalhe com filtros (status, data, cliente, pagamento) |
| `PATCH /orders/:id/status` | JWT | avança status (dispara WhatsApp + socket) |
| `POST /orders/:id/cancel` | JWT (gestão) | cancela + estorna estoque + avisa cliente |
| `GET /orders/:id/receipt` | JWT | PDF do recibo 80mm |

Segurança: validação class-validator em tudo, idempotência por chave no `POST /public/orders`
(evita pedido duplicado no duplo clique), throttler dedicado nas rotas públicas, total
**sempre recalculado no servidor** (preço do banco, nunca do payload), sanitização de
strings, XSS coberto pelo React, SQL injection coberto pelo Prisma.

## Roadmap de implementação

| Etapa | Entrega |
|---|---|
| **W1 — Núcleo de pedidos** ✅ | Schema + migration; `CriarPedidoUseCase` (valida/baixa estoque, transacional); status + histórico + estorno; endpoints públicos e administrativos; testes unitários |
| **W2 — Evolution API** ✅ | `IWhatsAppGateway` + adaptador; webhook de entrada (saudação + link); mensagens automáticas por status; log `MensagemWhatsApp`; cadastro automático de cliente pelo número |
| **W3 — Catálogo web** | Rotas públicas React mobile-first: busca, categorias, promoção, carrinho fixo, checkout em 2 passos, skeleton/toast/animações |
| **W4 — PDV tempo real** | Gateway Socket.IO; tela "Pedidos WhatsApp" (kanban de status + som de novo pedido); mudança de status com 1 clique |
| **W5 — Impressão & admin** | Recibo PDF 80mm (auto-abrir ao chegar pedido); painel admin: filtros, cancelar, editar, reimprimir |
| **W6 — Melhorias competitivas** | Priorizadas: recompra 1 clique → carrinho abandonado → cupons → agendamento → confirmação PIX → dashboard de delivery (cada uma aprovada individualmente) |

## Decisões adicionais tomadas na W2

### A10 — Degradação graciosa sem a Evolution API
Se `EVOLUTION_BASE_URL/API_KEY/INSTANCE` não estiverem configurados, o
`WHATSAPP_GATEWAY` resolve para `LoggingWhatsAppGateway`: as mensagens continuam
sendo **gravadas em `MensagemWhatsApp`** e registradas no log, e todo o módulo de
pedidos segue funcional. Permite desenvolver, testar e até operar (com aviso manual)
antes de ter um número de WhatsApp conectado. `GET /public/whatsapp/health` informa
o estado da integração.

### A11 — Notificação nunca derruba o pedido
`WhatsAppMessengerService` marca a mensagem como `FALHOU` com o erro e **não relança**.
O `CompositeOrderNotifier` usa `Promise.allSettled`: um canal quebrado (WhatsApp fora
do ar) não afeta os demais nem o fluxo transacional do pedido.

### A12 — Webhook fail-closed com comparação em tempo constante
Sem `WEBHOOK_SECRET` configurado, o endpoint responde **503** (desabilitado) em vez de
aceitar tudo. O segredo é comparado com `timingSafeEqual`. Aceita via header
`x-webhook-secret` ou query `?secret=`.

### A13 — Telefone nunca vai na URL do catálogo
O link enviado carrega um **JWT curto** (`?s=…`, validade 2h, claim `typ: 'catalog'`)
resolvido por `GET /public/whatsapp/session`. Evita PII em query string (que acabaria
em logs de servidor e histórico do navegador). O claim `typ` e a ausência de `sub`
impedem que o token de catálogo seja usado como token de acesso da API.

### A14 — Sem máquina de estados de conversa
Qualquer mensagem recebida (de número novo ou conhecido) responde saudação + link.
Um **anti-loop de 5 minutos** por telefone impede rajadas e eco de webhook. Mensagens
próprias (`fromMe`) e de grupos são ignoradas.

## Pré-requisitos de infraestrutura (responsabilidade do operador)

Necessários apenas para o WhatsApp **enviar de verdade** — o sistema roda sem eles:

1. **Instância da Evolution API** rodando (container Docker próprio) conectada a um
   número de WhatsApp real (QR Code).
2. URL pública para o webhook (produção: domínio; desenvolvimento: túnel tipo ngrok),
   configurada na Evolution como
   `POST https://SEU_DOMINIO/api/v1/webhooks/evolution?secret=<WEBHOOK_SECRET>`
   no evento `messages.upsert`.
3. Variáveis no `.env`: `EVOLUTION_BASE_URL`, `EVOLUTION_API_KEY`,
   `EVOLUTION_INSTANCE`, `WEBHOOK_SECRET`, `CATALOG_PUBLIC_URL`.
