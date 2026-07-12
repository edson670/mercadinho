# 🛒 Sistema Mercadinho

Sistema web completo para gestão de um mercadinho: PDV, controle de estoque, fiado, caixa, compras, relatórios e mais.

> **Status atual:** ✅ Todas as 11 etapas do roadmap concluídas — backend, frontend, testes automatizados e documentação.

---

## 🧱 Stack Tecnológica

### Backend
| Tecnologia | Uso |
|------------|-----|
| Node.js 22 | Runtime |
| TypeScript | Linguagem |
| NestJS | Framework backend (modular) |
| Prisma ORM | Acesso a dados |
| PostgreSQL | Banco de dados |
| JWT | Autenticação / sessão |
| Swagger (OpenAPI) | Documentação da API |
| pdfmake / exceljs | Exportação de relatórios (PDF/Excel) |
| Jest | Testes unitários |
| Docker | Containerização |

### Frontend
| Tecnologia | Uso |
|------------|-----|
| React 19 | UI |
| TypeScript | Linguagem |
| Vite | Build/dev server |
| Tailwind CSS | Estilização |
| Shadcn/ui | Componentes |
| TanStack Query | Cache/servidor de estado |
| React Hook Form + Zod | Formulários e validação |
| Zustand | Estado global (client) |
| Recharts | Gráficos |

---

## 🏛️ Princípios de Arquitetura

- **Clean Architecture** — separação por camadas (domínio, aplicação, infraestrutura, apresentação).
- **SOLID** — responsabilidade única, inversão de dependência via interfaces.
- **Arquitetura modular** — cada domínio de negócio é um módulo NestJS independente.
- **API REST documentada** com Swagger.
- **RBAC** — controle de acesso por perfil (Administrador, Gerente, Caixa).
- **Responsivo** — sidebar recolhível em desktop, drawer com overlay em mobile.

---

## 📚 Documentação

Toda a documentação técnica está em [`/docs`](./docs):

| Documento | Descrição |
|-----------|-----------|
| [01 - Visão Geral](./docs/01-visao-geral.md) | Objetivo, escopo e módulos |
| [02 - Arquitetura](./docs/02-arquitetura.md) | Clean Architecture, camadas, decisões |
| [03 - Estrutura de Pastas](./docs/03-estrutura-pastas.md) | Organização de backend e frontend |
| [04 - Modelagem de Dados](./docs/04-modelagem-dados.md) | Entidades, relacionamentos, dicionário |
| [05 - Diagramas](./docs/05-diagramas.md) | ER, fluxos e arquitetura (Mermaid) |
| [06 - Casos de Uso](./docs/06-casos-de-uso.md) | Casos de uso por módulo |
| [07 - Permissões](./docs/07-permissoes.md) | Matriz de permissões por perfil |
| [08 - API REST](./docs/08-api.md) | Endpoints por módulo |
| [09 - Roadmap](./docs/09-roadmap.md) | Etapas de implementação (todas ✅) |

O schema do banco está em [`backend/prisma/schema.prisma`](./backend/prisma/schema.prisma).

---

## 🚀 Como executar em desenvolvimento

```bash
# 1. Subir o PostgreSQL
docker compose up -d

# 2. Backend
cd backend
npm install
npx prisma migrate dev
npm run seed            # cria admin, categorias e configuração inicial
npm run start:dev       # API em http://localhost:3000 | Swagger em /docs

# 3. Frontend (em outro terminal)
cd frontend
npm install
npm run dev             # App em http://localhost:5173
```

**Login inicial** (criado pelo seed): `admin@mercado.local` / `Admin@123`.

---

## 🧪 Testes

```bash
cd backend
npm test                # testes unitários (Jest) — 22 testes cobrindo:
                         #  - StockService (movimentação de estoque, event-log)
                         #  - RegisterPaymentUseCase (pagamento de fiado, mudança de status)
                         #  - HashingService (hash/verificação de senha, tokens)
                         #  - AuditInterceptor (sanitização de dados sensíveis)
                         #  - AllExceptionsFilter (mapeamento de erros → HTTP)
```

```bash
cd frontend
npx tsc -b               # type-check completo (sem testes automatizados de UI nesta fase)
```

---

## 🐳 Deploy / Produção

Cada serviço tem seu próprio `Dockerfile` multi-stage, pronto para build:

```bash
# Backend (porta 3000)
docker build -t mercado-backend ./backend
docker run -p 3000:3000 --env-file backend/.env mercado-backend

# Frontend (porta 80, servido via Nginx)
docker build -t mercado-frontend ./frontend
docker run -p 8080:80 mercado-frontend
```

Antes de subir o backend em produção, aplique as migrações do banco uma vez:

```bash
cd backend
npx prisma migrate deploy
```

> Os Dockerfiles e o `docker-compose.yml` (Postgres local) não foram validados com `docker build`/`docker compose up` neste ambiente de desenvolvimento — Docker não está instalado aqui. Recomenda-se validar o build das imagens antes do primeiro deploy real.

---

## 📦 Módulos

Login · Usuários · Dashboard · Clientes · Produtos · Estoque · Vendas (PDV) · Fiado · Fornecedores · Compras · Caixa · Relatórios · Auditoria · Configurações.

Todos implementados, com testes de type-check (`tsc`/build), testes unitários no backend, e verificação visual de cada tela no navegador durante o desenvolvimento.
