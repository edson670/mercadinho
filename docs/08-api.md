# 08 — API REST

- Base URL: `/api/v1`
- Autenticação: `Authorization: Bearer <access_token>` (exceto login/refresh/recuperação).
- Documentação interativa: **Swagger** em `/docs`.
- Padrão de listagem: `?page=1&limit=20&search=&sort=campo:asc` → `{ data, total, page, limit }`.
- Erros: `{ statusCode, message, error, timestamp, path }`.

## Auth
| Método | Rota | Descrição | Perfis |
|--------|------|-----------|--------|
| POST | `/auth/login` | Autenticar | público |
| POST | `/auth/refresh` | Renovar access token | público (refresh) |
| POST | `/auth/logout` | Revogar sessão | autenticado |
| POST | `/auth/forgot-password` | Solicitar recuperação | público |
| POST | `/auth/reset-password` | Redefinir com token | público |
| GET | `/auth/me` | Dados do usuário logado | autenticado |

## Usuários
| Método | Rota | Perfis |
|--------|------|--------|
| GET | `/users` | Admin |
| POST | `/users` | Admin |
| GET | `/users/:id` | Admin |
| PATCH | `/users/:id` | Admin |
| PATCH | `/users/:id/status` | Admin |

## Clientes
| Método | Rota | Perfis |
|--------|------|--------|
| GET | `/customers` | Admin, Gerente, Caixa |
| POST | `/customers` | Admin, Gerente, Caixa |
| GET | `/customers/:id` | Admin, Gerente, Caixa |
| PATCH | `/customers/:id` | Admin, Gerente |
| GET | `/customers/:id/purchases` | Admin, Gerente, Caixa |
| GET | `/customers/:id/credit` | Admin, Gerente, Caixa |

## Categorias
| Método | Rota | Perfis |
|--------|------|--------|
| GET/POST/PATCH | `/categories` | Admin, Gerente |

## Produtos
| Método | Rota | Perfis |
|--------|------|--------|
| GET | `/products` | todos (leitura) |
| GET | `/products/search?q=` | todos (busca PDV) |
| POST | `/products` | Admin, Gerente |
| PATCH | `/products/:id` | Admin, Gerente |
| PATCH | `/products/:id/status` | Admin, Gerente |

## Estoque
| Método | Rota | Descrição | Perfis |
|--------|------|-----------|--------|
| POST | `/stock/entries` | Entrada manual | Admin, Gerente |
| POST | `/stock/adjustments` | Ajuste com motivo | Admin, Gerente |
| GET | `/stock/movements` | Histórico | Admin, Gerente |
| GET | `/stock/low` | Produtos abaixo do mínimo | Admin, Gerente |

## Fornecedores
| Método | Rota | Perfis |
|--------|------|--------|
| GET/POST/PATCH | `/suppliers` | Admin, Gerente |

## Compras
| Método | Rota | Descrição | Perfis |
|--------|------|-----------|--------|
| GET | `/purchases` | Listar | Admin, Gerente |
| POST | `/purchases` | Registrar (dá entrada no estoque) | Admin, Gerente |
| GET | `/purchases/:id` | Detalhe | Admin, Gerente |

## Vendas (PDV)
| Método | Rota | Descrição | Perfis |
|--------|------|-----------|--------|
| POST | `/sales` | Finalizar venda | Admin, Gerente, Caixa |
| GET | `/sales` | Listar (filtros/período) | Admin, Gerente, Caixa |
| GET | `/sales/:id` | Detalhe | Admin, Gerente, Caixa |
| POST | `/sales/:id/cancel` | Cancelar (estorna estoque) | Admin, Gerente |

## Fiado
| Método | Rota | Descrição | Perfis |
|--------|------|-----------|--------|
| GET | `/credit` | Listar fiados (filtro por status) | Admin, Gerente, Caixa |
| GET | `/credit/overdue` | Inadimplentes | Admin, Gerente, Caixa |
| GET | `/credit/:id` | Detalhe + pagamentos | Admin, Gerente, Caixa |
| POST | `/credit/:id/payments` | Registrar pagamento | Admin, Gerente, Caixa |

## Caixa
| Método | Rota | Descrição | Perfis |
|--------|------|-----------|--------|
| GET | `/cash-register/current` | Caixa aberto do operador | Admin, Gerente, Caixa |
| POST | `/cash-register/open` | Abrir | Admin, Gerente, Caixa |
| POST | `/cash-register/:id/close` | Fechar | Admin, Gerente, Caixa |
| POST | `/cash-register/:id/movements` | Sangria/suprimento | Admin, Gerente, Caixa |
| GET | `/cash-register` | Histórico | Admin, Gerente |

## Dashboard
| Método | Rota | Descrição | Perfis |
|--------|------|-----------|--------|
| GET | `/dashboard/summary` | Indicadores (dia/mês/faturado/fiado) | Admin, Gerente, Caixa |
| GET | `/dashboard/sales-chart?period=` | Vendas por período | Admin, Gerente |
| GET | `/dashboard/top-products` | Mais vendidos | Admin, Gerente |

## Relatórios
| Método | Rota | Descrição | Perfis |
|--------|------|-----------|--------|
| GET | `/reports/:type?from=&to=&format=pdf\|xlsx` | Gera/exporta relatório | Admin, Gerente |

`:type` ∈ `sales, products, stock, purchases, customers, credit`.

## Auditoria
| Método | Rota | Perfis |
|--------|------|--------|
| GET | `/audit?user=&entity=&from=&to=` | Admin |

## Configurações
| Método | Rota | Perfis |
|--------|------|--------|
| GET | `/settings` | Admin, Gerente, Caixa (leitura p/ logo/nome) |
| PATCH | `/settings` | Admin |
| POST | `/settings/logo` | Admin |
