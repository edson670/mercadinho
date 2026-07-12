# 07 — Matriz de Permissões (RBAC)

Perfis: **Administrador**, **Gerente**, **Caixa**.
Implementação: `@Roles(Role.ADMINISTRADOR, ...)` + `RolesGuard` no backend; rotas protegidas por perfil no frontend.

Legenda: ✅ acesso total · 🟡 parcial/somente leitura · ❌ sem acesso.

| Módulo / Ação | Administrador | Gerente | Caixa |
|---------------|:---:|:---:|:---:|
| **Login / sessão** | ✅ | ✅ | ✅ |
| **Usuários** (CRUD) | ✅ | ❌ | ❌ |
| **Configurações da empresa** | ✅ | ❌ | ❌ |
| **Auditoria** | ✅ | 🟡 leitura | ❌ |
| **Dashboard** | ✅ | ✅ | 🟡 operacional |
| **Clientes** (CRUD) | ✅ | ✅ | 🟡 criar/ver |
| **Categorias** | ✅ | ✅ | ❌ |
| **Produtos** (CRUD) | ✅ | ✅ | 🟡 leitura |
| **Estoque** (entrada/ajuste) | ✅ | ✅ | ❌ |
| **Estoque** (consulta/alertas) | ✅ | ✅ | 🟡 leitura |
| **Fornecedores** | ✅ | ✅ | ❌ |
| **Compras** | ✅ | ✅ | ❌ |
| **Vendas / PDV** | ✅ | ✅ | ✅ |
| **Cancelar venda** | ✅ | ✅ | ❌ |
| **Fiado** (registrar/pagar/consultar) | ✅ | ✅ | ✅ |
| **Caixa** (abrir/fechar/sangria) | ✅ | ✅ | ✅ |
| **Relatórios** (gerar/exportar) | ✅ | ✅ | ❌ |

## Detalhamento

### Administrador
Acesso irrestrito. Único perfil que gerencia **usuários**, **configurações da empresa** e a **auditoria** completa.

### Gerente
Opera todo o back-office comercial: **produtos, categorias, estoque, fornecedores, compras, clientes, relatórios**. Também pode vender e operar caixa. Não gerencia usuários nem configurações.

### Caixa
Foco na **operação de frente de loja**: PDV, caixa (abrir/fechar/sangria) e fiado. Enxerga produtos/clientes para vender, mas não os edita; sem acesso a compras, relatórios ou gestão.

> A matriz é o contrato de RBAC. Qualquer nova rota deve declarar explicitamente seus perfis permitidos.
