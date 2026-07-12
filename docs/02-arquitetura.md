# 02 — Arquitetura

## Visão de alto nível

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (SPA)                         │
│   React 19 + Vite + Tailwind + Shadcn/ui + TanStack Query    │
│                  Zustand · React Hook Form                     │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / REST (JSON) + JWT
┌───────────────────────────▼─────────────────────────────────┐
│                       Backend (NestJS)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │ Presentation │  │ Application  │  │      Domain       │    │
│  │ Controllers  │→ │ Use Cases /  │→ │ Entities, VOs,    │    │
│  │ DTOs, Guards │  │ Services     │  │ Repo Interfaces   │    │
│  └──────────────┘  └──────┬───────┘  └──────────────────┘    │
│                           │ implements                        │
│                  ┌────────▼────────┐                          │
│                  │  Infrastructure  │  Prisma repositories,   │
│                  │  (Prisma, JWT,   │  auth, mailer, storage  │
│                  │   external I/O)  │                         │
│                  └────────┬─────────┘                         │
└───────────────────────────┼─────────────────────────────────┘
                            │
                  ┌─────────▼─────────┐
                  │   PostgreSQL 16   │
                  └───────────────────┘
```

## Clean Architecture — camadas

A dependência sempre aponta **para dentro** (regra de dependência). O domínio não conhece o Prisma, nem o HTTP.

### 1. Domain (núcleo)
- **Entities / Value Objects:** regras de negócio puras (ex.: `Venda` calcula total e valida desconto; `Fiado` calcula saldo).
- **Repository Interfaces:** contratos (`IProdutoRepository`) — sem implementação.
- **Domain Errors:** exceções de negócio (`EstoqueInsuficienteError`).
- Sem dependência de frameworks.

### 2. Application (casos de uso)
- **Use Cases / Services:** orquestram o domínio (ex.: `FinalizarVendaUseCase` — baixa estoque, gera fiado se necessário, registra caixa e auditoria).
- Dependem apenas de **interfaces** do domínio (Dependency Inversion).
- Transações coordenadas aqui (Unit of Work via Prisma `$transaction`).

### 3. Infrastructure
- **Prisma repositories:** implementam as interfaces do domínio.
- **Adapters:** JWT, hashing, mailer (recuperação de senha), storage (logo), gerador de PDF/Excel.
- **PrismaService:** conexão e ciclo de vida.

### 4. Presentation
- **Controllers:** rotas REST, recebem/retornam DTOs.
- **DTOs + class-validator/Zod:** validação de entrada e contrato Swagger.
- **Guards / Interceptors / Filters:** `JwtAuthGuard`, `RolesGuard`, `AuditInterceptor`, `HttpExceptionFilter`.

## Aplicação dos princípios SOLID

| Princípio | Aplicação |
|-----------|-----------|
| **S**ingle Responsibility | Cada use case faz uma coisa; controllers só lidam com HTTP; repositórios só com persistência. |
| **O**pen/Closed | Novas formas de pagamento/relatórios via estratégias, sem alterar o núcleo. |
| **L**iskov | Implementações de repositório são substituíveis (Prisma, mock em testes). |
| **I**nterface Segregation | Interfaces de repositório específicas por agregado, não uma "god interface". |
| **D**ependency Inversion | Application/Domain dependem de abstrações; Infra fornece implementações via DI do Nest. |

## Padrão por módulo NestJS

Cada módulo (`produtos`, `vendas`, `fiado`, ...) segue a mesma anatomia:

```
modulo/
├── domain/            # entidades, VOs, interfaces de repositório, erros
├── application/       # use cases, DTOs de aplicação, mappers
├── infra/             # repositório Prisma, providers específicos
├── presentation/      # controller(s), DTOs de request/response
└── modulo.module.ts   # wiring de DI
```

## Decisões de arquitetura (ADRs resumidos)

1. **NestJS modular + Clean Architecture** — combina DI nativa do Nest com camadas explícitas; escalável e testável.
2. **Perfis como enum (`Role`) + RBAC por decorators** — simples e suficiente para 3 perfis; matriz de permissões em código (`@Roles(...)`). Evolução futura: tabela de permissões granular sem quebrar a API.
3. **Auditoria via Interceptor** — captura ações mutáveis (POST/PUT/PATCH/DELETE) de forma transversal, sem poluir cada use case.
4. **Movimentações de estoque imutáveis** — todo delta de estoque gera um registro em `MovimentacaoEstoque` (event log), garantindo rastreabilidade e histórico.
5. **Fiado como agregado próprio** ligado à venda — permite pagamentos parciais e histórico independentes.
6. **Transações no banco** — finalizar venda, registrar compra e pagar fiado usam `prisma.$transaction` para consistência.
7. **Soft delete** (`ativo`/`active`) em cadastros — preserva integridade referencial e histórico.

## Segurança

- Senhas com **argon2/bcrypt** (nunca em texto puro).
- **JWT de acesso** (curta duração) + **refresh token** para controle de sessão.
- `RolesGuard` valida perfil por rota.
- Validação e sanitização de todas as entradas (DTOs).
- **Rate limiting** no login e recuperação de senha.
- Recuperação de senha por **token temporário** com expiração.

## Tratamento de erros

- **Domain errors** → mapeados para HTTP status apropriados por um `ExceptionFilter` global.
- Respostas de erro padronizadas: `{ statusCode, message, error, timestamp, path }`.
