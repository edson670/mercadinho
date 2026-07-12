# 01 — Visão Geral

## Objetivo

Fornecer um sistema web moderno, rápido e responsivo para a gestão completa de um mercadinho, cobrindo os fluxos essenciais do dia a dia (vendas, estoque, fiado, caixa) com uma estrutura preparada para crescimento futuro.

## Público-alvo

- **Administrador** — dono do negócio; acesso total, configurações e relatórios.
- **Gerente** — gerencia produtos, compras, estoque, clientes e relatórios.
- **Caixa** — opera o PDV, o caixa diário e o fiado.

## Escopo (MVP)

| Módulo | Descrição resumida |
|--------|--------------------|
| **Login** | Autenticação JWT, logout, recuperação de senha, controle de sessão |
| **Usuários** | CRUD de usuários e atribuição de perfis/permissões |
| **Dashboard** | Indicadores do dia/mês, gráficos de vendas e produtos |
| **Clientes** | Cadastro, histórico de compras, histórico de fiado, saldo devedor |
| **Produtos** | Cadastro com categoria, preços, estoque, unidade e status |
| **Estoque** | Entradas, saídas automáticas, ajustes, alertas e histórico |
| **Vendas (PDV)** | Venda rápida com busca, desconto, múltiplas formas de pagamento |
| **Fiado** | Venda a prazo, saldo devedor, pagamentos, inadimplentes |
| **Fornecedores** | Cadastro simples |
| **Compras** | Registro de compras que alimentam o estoque |
| **Caixa** | Abertura, fechamento, sangria e histórico |
| **Relatórios** | Vendas, produtos, estoque, compras, clientes, fiado — export PDF/Excel |
| **Auditoria** | Registro de ações (usuário, data, ação) |
| **Configurações** | Dados da empresa (nome, CNPJ, endereço, telefone, logo) |

## Fora do escopo (nesta versão)

- Emissão fiscal (NF-e / NFC-e / SAT).
- Integração com gateways de pagamento reais (TEF/PIX automático).
- Multi-loja / multi-empresa (a estrutura permite evolução futura).
- App mobile nativo (a interface web é responsiva).

## Requisitos não-funcionais

- **Segurança:** JWT, hashing de senha (bcrypt/argon2), RBAC, validação de entrada.
- **Qualidade:** TypeScript em todo o projeto, código limpo, testes.
- **Performance:** paginação e filtros no servidor, cache com TanStack Query.
- **Usabilidade:** responsivo, tema claro/escuro, menu lateral recolhível.
- **Manutenibilidade:** arquitetura modular, componentes reutilizáveis.
- **Observabilidade:** auditoria de ações e tratamento centralizado de erros.
