# 12 — Deploy em produção (TLS e superfície de rede)

Complementa o [plano de remediação](11-analise-seguranca.md#7-plano-de-remediação-priorizado).
Cobre o achado **A4 — stack em HTTP puro**, que não pode ser resolvido no
ambiente local: TLS exige um domínio real e certificado válido.

> **Estado atual (dev local):** tudo em HTTP, portas do Postgres e da Evolution
> restritas a `127.0.0.1`. É aceitável para testes **com dados fictícios**.
> Nenhum dado real de cliente deve trafegar nessa configuração.

---

## 1. Topologia alvo

Hoje o backend roda no host (`npm run start:dev`) e só os serviços de apoio
estão em containers. Em produção tudo fica atrás de um único proxy reverso, e
**nenhuma porta de aplicação é publicada diretamente**:

```
Internet
   │  443/TLS
   ▼
Caddy / Nginx  ──────────────┐
   │                         │
   ├─ /            → frontend (build estático)
   ├─ /api/v1      → backend:3000
   └─ /uploads     → backend:3000
                             │
        rede interna Docker  │  (sem portas publicadas)
        ┌────────────────────┴────────────────┐
        │  postgres:5432   evolution-api:8080 │
        │  redis:6379                         │
        └─────────────────────────────────────┘
```

Pontos-chave:

- O **Postgres e a Evolution API deixam de ter mapeamento de portas** — passam a
  ser alcançáveis só pelo nome do serviço dentro da rede do compose.
- O **backend entra no compose**. Com isso `EVOLUTION_BASE_URL` vira
  `http://evolution-api:8080` e o webhook global passa a apontar para
  `http://backend:3000/...`, dispensando o `host.docker.internal`.
- Só o proxy expõe portas (80 e 443).

---

## 2. Proxy reverso com TLS

Exemplo com Caddy, que obtém e renova o certificado Let's Encrypt sozinho:

```caddyfile
mercadinho.exemplo.com.br {
    encode gzip

    # Cabeçalhos que o backend não controla quando está atrás do proxy
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        -Server
    }

    handle /api/v1/* {
        reverse_proxy backend:3000
    }

    handle /uploads/* {
        reverse_proxy backend:3000
    }

    handle {
        root * /srv/frontend
        try_files {path} /index.html
        file_server
    }
}
```

O Caddy já redireciona HTTP→HTTPS automaticamente. Com Nginx, adicionar um
`server` na porta 80 com `return 301 https://$host$request_uri;`.

---

## 3. Ajustes necessários na aplicação

### 3.1 `trust proxy`

Sem isso, o rate limiting passa a enxergar o IP do proxy para **todos** os
clientes — um usuário estoura o limite de todo mundo (achado M8):

```ts
// main.ts
app.set('trust proxy', 1); // 1 = um proxy à frente
```

### 3.2 Variáveis de ambiente

| Variável | Dev | Produção |
| --- | --- | --- |
| `CORS_ORIGIN` | `http://localhost:5173,http://192.168.0.5:5173` | `https://mercadinho.exemplo.com.br` |
| `CATALOG_PUBLIC_URL` | `http://192.168.0.5:5173/catalogo` | `https://mercadinho.exemplo.com.br/catalogo` |
| `EVOLUTION_BASE_URL` | `http://localhost:8080` | `http://evolution-api:8080` (rede interna) |
| `NODE_ENV` | `development` | `production` |

Remover da lista de CORS qualquer origem `http://` — com a stack em HTTPS elas
só servem para enfraquecer a política.

### 3.3 Segredos

Gerar **todos** novamente para produção — nenhum valor de dev deve ser
reaproveitado:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Aplica-se a `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `WEBHOOK_SECRET`,
`EVOLUTION_API_KEY`, `POSTGRES_PASSWORD` e `SEED_ADMIN_PASSWORD`.

---

## 4. Senha do PostgreSQL em banco já existente

`POSTGRES_PASSWORD` no compose só tem efeito quando o volume é criado do zero.
Para um banco que já existe, a troca é feita no próprio Postgres:

```bash
docker exec -it mercado_postgres psql -U mercado -d mercado \
  -c "ALTER USER mercado WITH PASSWORD 'nova-senha-forte';"
```

Depois atualizar, na mesma janela de manutenção:

1. `POSTGRES_PASSWORD` no `.env` da raiz (usado pelo compose e pela Evolution);
2. `DATABASE_URL` em `backend/.env`;
3. `docker compose up -d --force-recreate evolution-api` e reiniciar o backend.

### Usuário sem privilégios de DDL

Hoje a aplicação usa o dono do banco, que pode executar `DROP TABLE`. O ideal é
um usuário separado apenas com DML, deixando as migrations do Prisma para um
usuário privilegiado usado só no deploy:

```sql
CREATE USER mercado_app WITH PASSWORD 'senha-forte';
GRANT CONNECT ON DATABASE mercado TO mercado_app;
GRANT USAGE ON SCHEMA public TO mercado_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mercado_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mercado_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO mercado_app;
```

---

## 5. Checklist antes de expor à internet

- [ ] TLS válido, HTTP redirecionando para HTTPS, HSTS ativo
- [ ] Backend movido para o compose; Postgres, Redis e Evolution **sem** portas publicadas
- [ ] `app.set('trust proxy', 1)` configurado
- [ ] Todos os segredos regerados (§3.3)
- [ ] Senha do Postgres trocada e usuário da aplicação sem DDL (§4)
- [ ] `SEED_ADMIN_PASSWORD` alterada e troca forçada no primeiro login
- [ ] pgAdmin removido do compose de produção
- [ ] Swagger desativado (`NODE_ENV === 'production'`)
- [ ] Backup automatizado, criptografado e com **restauração testada**
- [ ] Firewall do host liberando apenas 80/443
- [ ] Reteste de segurança (Fase 4 do plano de remediação)
