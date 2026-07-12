# 09 — Roadmap de Implementação

Implementação incremental, módulo a módulo. Cada etapa entrega backend (use cases + endpoints + Swagger + validação) e frontend (telas + hooks) testáveis de ponta a ponta.

## Etapa 0 — Fundação ✅ (esta entrega)
- Documentação técnica, arquitetura, estrutura de pastas.
- Modelagem de dados (`schema.prisma`), diagramas, casos de uso, permissões, contrato de API.

## Etapa 1 — Bootstrap do projeto ✅
- `docker-compose.yml` (PostgreSQL).
- Backend NestJS: config, PrismaModule, filtros/pipes globais, Swagger, estrutura `core/`.
- Frontend Vite + Tailwind + Shadcn/ui + layout base (AppShell, Sidebar recolhível, tema claro/escuro), api-client, TanStack Query, roteamento.
- Prisma migrate inicial + seed (admin, config, categorias).

## Etapa 2 — Autenticação & Usuários ✅
- Login/logout, JWT + refresh, recuperação de senha, `RolesGuard`.
- CRUD de usuários (Admin).
- Frontend: telas de login, recuperação, gestão de usuários; store de auth; rotas protegidas.

## Etapa 3 — Cadastros base ✅
- Categorias, Produtos, Clientes, Fornecedores (CRUD + tabelas com filtros/paginação/busca).

## Etapa 4 — Estoque & Compras ✅
- Movimentações de estoque (entrada/ajuste), alertas de mínimo, histórico.
- Compras (registro → entrada automática).

## Etapa 5 — Caixa ✅
- Abrir/fechar caixa, sangria/suprimento, histórico.

## Etapa 6 — Vendas (PDV) ✅
- PDV: busca rápida, carrinho (Zustand), desconto, formas de pagamento.
- Finalização transacional (baixa de estoque, vínculo ao caixa).
- Cancelamento com estorno.

## Etapa 7 — Fiado ✅
- Geração a partir da venda, pagamentos, saldo devedor, inadimplentes.

## Etapa 8 — Dashboard ✅
- Indicadores + gráficos (Recharts): vendas por período, mais vendidos, fiado.

## Etapa 9 — Relatórios ✅
- Geração e exportação PDF/Excel dos 6 tipos.

## Etapa 10 — Auditoria & Configurações ✅
- AuditInterceptor + consulta de trilha.
- Configurações da empresa + upload de logo.

## Etapa 11 — Acabamento ✅
- Testes (unit/e2e), refinamento de UX, responsividade, Dockerfiles de produção, README de execução.

**Concluído:**
- 22 testes unitários (Jest): StockService, RegisterPaymentUseCase, HashingService, AuditInterceptor, AllExceptionsFilter.
- Sidebar responsiva: drawer com overlay em mobile (<768px), estática em desktop.
- Code-splitting por rota (React.lazy + Suspense): bundle principal de 1051KB → 515KB.
- README atualizado com instruções de execução, testes e deploy.

**Projeto completo — todas as 11 etapas do roadmap implementadas e verificadas.**

---

### Critérios de "pronto" por etapa
- TypeScript sem erros; validação de entrada; tratamento de erros.
- Endpoints documentados no Swagger; permissões aplicadas.
- Telas responsivas; estados de loading/erro/vazio; componentes reutilizáveis.
- Fluxo principal testado ponta a ponta.
