# 03 — Estrutura de Pastas

## Monorepo

```
mercado/
├── docs/                      # documentação técnica
├── backend/                   # API NestJS
├── frontend/                  # SPA React
├── docker-compose.yml         # Postgres (+ pgAdmin opcional)
└── README.md
```

---

## Backend (NestJS + Clean Architecture)

```
backend/
├── prisma/
│   ├── schema.prisma          # modelagem do banco
│   ├── migrations/            # migrações versionadas
│   └── seed.ts                # dados iniciais (admin, config, categorias)
├── src/
│   ├── main.ts                # bootstrap + Swagger + pipes globais
│   ├── app.module.ts
│   │
│   ├── core/                  # blocos transversais
│   │   ├── config/            # env, ConfigModule
│   │   ├── database/          # PrismaService, PrismaModule
│   │   ├── auth/              # JwtStrategy, guards, decorators (@Roles, @CurrentUser)
│   │   ├── audit/             # AuditInterceptor + serviço
│   │   ├── errors/            # domain errors base + HttpExceptionFilter
│   │   ├── pagination/        # helpers de paginação/filtros
│   │   └── common/            # DTOs base, utils, tipos compartilhados
│   │
│   ├── modules/               # um módulo por domínio
│   │   ├── auth/              # login, logout, refresh, recuperar senha
│   │   ├── users/
│   │   ├── customers/         # clientes
│   │   ├── categories/
│   │   ├── products/
│   │   ├── stock/             # movimentações e ajustes de estoque
│   │   ├── suppliers/         # fornecedores
│   │   ├── purchases/         # compras + itens
│   │   ├── sales/             # vendas (PDV) + itens
│   │   ├── credit/            # fiado + pagamentos
│   │   ├── cash-register/     # caixa + sangria
│   │   ├── dashboard/
│   │   ├── reports/           # PDF/Excel
│   │   └── settings/          # configurações da empresa
│   │
│   └── shared/                # value objects e tipos de domínio comuns (CPF, Money)
├── test/                      # e2e
├── .env.example
├── Dockerfile
├── nest-cli.json
├── tsconfig.json
└── package.json
```

### Anatomia de um módulo (ex.: `products`)

```
modules/products/
├── domain/
│   ├── entities/product.entity.ts
│   ├── repositories/product.repository.ts     # interface (contrato)
│   └── errors/product.errors.ts
├── application/
│   ├── use-cases/
│   │   ├── create-product.use-case.ts
│   │   ├── update-product.use-case.ts
│   │   ├── list-products.use-case.ts
│   │   └── ...
│   └── mappers/product.mapper.ts
├── infra/
│   └── prisma-product.repository.ts           # implementa a interface
├── presentation/
│   ├── products.controller.ts
│   └── dto/
│       ├── create-product.dto.ts
│       ├── update-product.dto.ts
│       └── product-response.dto.ts
└── products.module.ts
```

---

## Frontend (React + Vite)

```
frontend/
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/                # definição de rotas + rotas protegidas por perfil
│   │
│   ├── app/                   # providers globais (Query, Theme, Auth)
│   │
│   ├── components/
│   │   ├── ui/                # componentes Shadcn/ui gerados
│   │   ├── layout/            # AppShell, Sidebar recolhível, Topbar
│   │   └── shared/            # DataTable, ThemeToggle, ConfirmDialog, etc.
│   │
│   ├── features/              # organização por domínio (espelha o backend)
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── customers/
│   │   ├── products/
│   │   ├── stock/
│   │   ├── suppliers/
│   │   ├── purchases/
│   │   ├── sales/             # PDV
│   │   ├── credit/            # fiado
│   │   ├── cash-register/
│   │   ├── reports/
│   │   └── settings/
│   │       ├── api/           # funções de fetch + hooks TanStack Query
│   │       ├── components/
│   │       ├── pages/
│   │       └── schemas/       # Zod
│   │
│   ├── lib/
│   │   ├── api-client.ts      # axios/fetch com interceptors JWT
│   │   ├── utils.ts           # cn(), formatadores (moeda, data)
│   │   └── query-client.ts
│   │
│   ├── stores/                # Zustand (auth, ui/sidebar, pdv-cart)
│   ├── hooks/                 # hooks reutilizáveis
│   ├── types/                 # tipos compartilhados / contratos da API
│   └── styles/                # globals.css (Tailwind)
├── components.json            # config Shadcn/ui
├── tailwind.config.ts
├── vite.config.ts
├── .env.example
├── Dockerfile
└── package.json
```

### Padrão de uma feature no frontend (ex.: `products`)

- `api/products.api.ts` — chamadas REST tipadas.
- `api/use-products.ts` — hooks `useProducts`, `useCreateProduct` (TanStack Query).
- `schemas/product.schema.ts` — validação Zod (compartilhada com o form).
- `components/ProductForm.tsx`, `ProductsTable.tsx`.
- `pages/ProductsPage.tsx` — composição da tela.
