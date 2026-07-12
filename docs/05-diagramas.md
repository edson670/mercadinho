# 05 — Diagramas

> Diagramas em [Mermaid](https://mermaid.js.org). Renderizam no GitHub/VS Code.

## Diagrama Entidade-Relacionamento (ER)

```mermaid
erDiagram
    USUARIO ||--o{ VENDA : registra
    USUARIO ||--o{ COMPRA : registra
    USUARIO ||--o{ CAIXA : opera
    USUARIO ||--o{ MOVIMENTACAO_ESTOQUE : gera
    USUARIO ||--o{ PAGAMENTO_FIADO : recebe
    USUARIO ||--o{ AUDITORIA : produz

    CLIENTE ||--o{ VENDA : realiza
    CLIENTE ||--o{ FIADO : possui

    CATEGORIA ||--o{ PRODUTO : agrupa
    PRODUTO ||--o{ ITEM_VENDA : compoe
    PRODUTO ||--o{ ITEM_COMPRA : compoe
    PRODUTO ||--o{ MOVIMENTACAO_ESTOQUE : movimenta

    FORNECEDOR ||--o{ COMPRA : fornece
    COMPRA ||--o{ ITEM_COMPRA : contem

    CAIXA ||--o{ VENDA : agrupa
    CAIXA ||--o{ MOVIMENTACAO_CAIXA : registra

    VENDA ||--o{ ITEM_VENDA : contem
    VENDA ||--o| FIADO : gera

    FIADO ||--o{ PAGAMENTO_FIADO : recebe

    USUARIO {
        uuid id PK
        string nome
        string email UK
        string senhaHash
        enum role
        bool ativo
    }
    CLIENTE {
        uuid id PK
        string nome
        string cpf UK
        string telefone
    }
    PRODUTO {
        uuid id PK
        string nome
        string codigoBarras UK
        decimal precoVenda
        decimal estoque
        decimal estoqueMinimo
    }
    VENDA {
        uuid id PK
        int numero
        decimal total
        enum formaPagamento
        enum status
    }
    FIADO {
        uuid id PK
        decimal valorOriginal
        decimal saldo
        enum status
    }
    CAIXA {
        uuid id PK
        enum status
        decimal valorAbertura
    }
```

## Diagrama de camadas (Clean Architecture)

```mermaid
flowchart TD
    subgraph Presentation
        C[Controller + DTOs]
        G[Guards / Filters / Interceptors]
    end
    subgraph Application
        UC[Use Cases]
    end
    subgraph Domain
        E[Entities / VOs]
        RI[Repository Interfaces]
    end
    subgraph Infrastructure
        R[Prisma Repositories]
        AD[Adapters: JWT, Mailer, PDF/Excel]
    end
    DB[(PostgreSQL)]

    C --> UC
    G -.-> C
    UC --> E
    UC --> RI
    R -. implements .-> RI
    R --> DB
    UC --> AD
```

## Fluxo — Finalizar Venda (PDV)

```mermaid
sequenceDiagram
    actor Caixa
    participant UI as Frontend (PDV)
    participant API as SalesController
    participant UC as FinalizarVendaUseCase
    participant DB as PostgreSQL (transação)

    Caixa->>UI: adiciona itens, desconto, forma de pagamento
    UI->>API: POST /sales
    API->>UC: executar(dto, usuario)
    UC->>DB: BEGIN
    UC->>DB: valida caixa ABERTO
    UC->>DB: valida estoque de cada item
    alt estoque insuficiente
        UC-->>API: EstoqueInsuficienteError (409)
    else ok
        UC->>DB: cria Venda + ItensVenda
        UC->>DB: baixa estoque (MovimentacaoEstoque SAIDA)
        alt pagamento = FIADO
            UC->>DB: cria Fiado (saldo = total)
        end
        UC->>DB: registra Auditoria
        UC->>DB: COMMIT
        UC-->>API: VendaResponse
        API-->>UI: 201 Created
    end
```

## Fluxo — Pagamento de Fiado

```mermaid
sequenceDiagram
    actor Operador
    participant API as CreditController
    participant UC as RegistrarPagamentoUseCase
    participant DB as PostgreSQL

    Operador->>API: POST /credit/:id/payments {valor}
    API->>UC: executar
    UC->>DB: carrega Fiado
    UC->>UC: valida valor <= saldo
    UC->>DB: cria PagamentoFiado
    UC->>DB: valorPago += valor; saldo = original - pago
    UC->>DB: status = (saldo==0 ? QUITADO : PARCIAL)
    UC-->>API: FiadoResponse
```

## Fluxo — Ciclo do Caixa

```mermaid
stateDiagram-v2
    [*] --> ABERTO: Abrir caixa (valor inicial)
    ABERTO --> ABERTO: Venda / Sangria / Suprimento
    ABERTO --> FECHADO: Fechar caixa (consolida totais)
    FECHADO --> [*]
```
