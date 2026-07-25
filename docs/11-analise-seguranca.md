# 11 — Análise de Segurança

Revisão de segurança do código-fonte (SAST manual) e da configuração de
infraestrutura do Sistema Mercadinho, cobrindo autenticação, autorização,
frontend, backend, PostgreSQL, Evolution API, dependências e conformidade LGPD.

> **Escopo e método.** Esta é uma revisão de **código e configuração**, feita
> lendo o repositório. Não foi executado pentest ativo (nenhuma exploração real
> contra o sistema em execução), nem varredura de infraestrutura de produção —
> o ambiente hoje é local. As severidades assumem o cenário de **produção
> exposta à internet**; várias caem em ambiente puramente local.

---

## 1. Resumo executivo

**Nível de risco geral: MÉDIO-ALTO para produção · BAIXO para o uso local atual.**

A base tem fundamentos de segurança bem escolhidos — Argon2, Prisma
parametrizado, guards globais na ordem correta, validação com whitelist,
auditoria com sanitização. Não foram encontradas vulnerabilidades clássicas de
injeção (SQLi, XSS refletido, command injection).

O risco concentra-se em **três eixos**:

1. **Cadeia de XSS armazenado → roubo de sessão.** O upload de logotipo aceita
   extensão e MIME controlados pelo cliente e serve o arquivo na mesma origem
   da aplicação; os tokens ficam em `localStorage`; e não há CSP nem `nosniff`
   para conter o impacto. Os três juntos formam um caminho completo de
   comprometimento.
2. **Superfície de infraestrutura sem TLS e com credenciais de exemplo.**
   Postgres e Evolution API com portas publicadas e senhas/chaves triviais
   versionadas no `docker-compose.yml`.
3. **Higiene de sessão e trilha de auditoria incompletas.** Tokens
   persistidos em texto puro, reset de senha que não revoga sessões, e
   tentativas de login falhas que não são registradas.

Nenhum achado é crítico *hoje* (ambiente local, sem exposição pública), mas os
itens de severidade ALTA devem ser corrigidos **antes de qualquer deploy**.

| Severidade | Qtd. |
| --- | --- |
| Crítica | 0 |
| Alta | 5 |
| Média | 10 |
| Baixa | 5 |

---

## 2. Inventário de ativos

| Ativo | Tecnologia | Exposição atual | Dados sensíveis |
| --- | --- | --- | --- |
| Frontend | React 19 + Vite | `:5173` (LAN) | Tokens JWT em `localStorage` |
| Backend API | NestJS 11 | `:3000` (LAN) | Credenciais, PII de clientes |
| Banco | PostgreSQL 16 (Docker) | `:5432` publicada | Hashes, PII, financeiro |
| Evolution API | v2.3.7 (Docker) | `:8080` publicada | Sessão WhatsApp da loja |
| Redis | 7-alpine (Docker) | interna (sem porta) | Cache de sessão WhatsApp |
| pgAdmin | dpage/pgadmin4 | `:5050` (profile `tools`) | Acesso total ao banco |
| Uploads | disco (`backend/uploads/`) | servido em `/uploads` | — |

---

## 3. Vulnerabilidades — severidade ALTA

### A1. Upload de logotipo permite XSS armazenado na origem da aplicação

**Onde:** `backend/src/modules/settings/presentation/settings.controller.ts:60-81`

Dois controles insuficientes se combinam:

```ts
filename: (_req, file, cb) => cb(null, `logo-${randomUUID()}${extname(file.originalname)}`),
// ...
fileFilter: (_req, file, cb) => {
  if (!ALLOWED_MIME.has(file.mimetype)) { /* rejeita */ }
}
```

- `file.mimetype` vem do cabeçalho `Content-Type` da parte multipart — é
  **fornecido pelo cliente** e trivialmente forjável. Não é uma verificação do
  conteúdo real do arquivo.
- A extensão gravada em disco vem de `extname(file.originalname)`, também
  controlada pelo cliente. O UUID randomiza só o nome-base, não a extensão.

O arquivo é servido por `app.useStaticAssets(..., { prefix: '/uploads' })`
(`main.ts`), que define o `Content-Type` **pela extensão do arquivo**.

**Cenário de falha:** um administrador (ou alguém com sessão de administrador)
envia `payload.html` declarando `Content-Type: image/png`. O filtro aprova, o
arquivo é salvo como `logo-<uuid>.html` e passa a ser servido como `text/html`
em `http://<host>/uploads/logo-<uuid>.html`. Ao abrir essa URL, o script roda
**na mesma origem da aplicação** e consegue ler
`localStorage['mercado-auth']` — que contém `accessToken` e `refreshToken`
(ver A2).

**Agravante independente do forjamento:** `image/svg+xml` está na allowlist.
SVG é um formato XML que executa `<script>` quando aberto diretamente no
navegador. Ou seja, mesmo um upload perfeitamente "honesto" de SVG já é um
vetor de XSS armazenado.

**Correção:**
1. Derivar a extensão de uma allowlist do lado do servidor, nunca de
   `originalname`: `const ext = MIME_TO_EXT[file.mimetype]`.
2. Validar o conteúdo real (magic bytes) — ex.: `file-type`.
3. Remover `image/svg+xml` da allowlist, ou sanitizar com DOMPurify antes de
   gravar.
4. Servir uploads com `Content-Disposition: attachment` e
   `X-Content-Type-Options: nosniff`; idealmente de um domínio/bucket separado.

---

### A2. Tokens de sessão em `localStorage`

**Onde:** `frontend/src/stores/auth.store.ts:22-49` (`persist`, chave `mercado-auth`)

`accessToken` e `refreshToken` são persistidos em `localStorage`, acessível a
qualquer JavaScript da origem. Não há cookies `HttpOnly` / `Secure` /
`SameSite`.

**Cenário de falha:** qualquer XSS (como o A1) lê os dois tokens. O
`refreshToken` vale **7 dias** e permite renovação contínua — o atacante mantém
acesso mesmo depois de o usuário fechar o navegador.

**Correção:** migrar o refresh token para cookie `HttpOnly; Secure;
SameSite=Strict` (mantendo o access token curto em memória), ou — como
mitigação mais barata — reduzir a validade do refresh e implementar detecção de
reuso de token rotacionado.

> Nota: é um *trade-off* consciente e comum em SPAs. O problema aqui não é o
> `localStorage` isolado, e sim ele somado a A1 (XSS viável) e A3 (sem CSP).

---

### A3. Ausência de cabeçalhos de segurança HTTP

**Onde:** `backend/src/main.ts` — `helmet` não está instalado nem registrado.

Faltam: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`,
`Strict-Transport-Security`, `Referrer-Policy`.

**Impacto:** sem CSP, um XSS não tem nenhuma contenção; sem `nosniff`, o
navegador pode inferir tipo de conteúdo e ampliar A1; sem `X-Frame-Options`, a
aplicação é passível de clickjacking.

**Correção:**
```bash
npm i helmet
```
```ts
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } } }));
```

---

### A4. Toda a stack em HTTP puro

**Onde:** `backend/.env` (`CATALOG_PUBLIC_URL=http://192.168.0.5:5173/catalogo`),
`docker-compose.yml:63` (`SERVER_URL: http://localhost:8080`).

O checkout do catálogo coleta **nome, telefone e endereço residencial
completo** do cliente e trafega tudo em texto claro. Credenciais de login e
tokens JWT idem.

**Correção:** TLS obrigatório em produção (proxy reverso com Let's Encrypt),
redirecionamento 301 de HTTP→HTTPS e HSTS. Em rede local para testes o risco é
aceitável, mas **nenhum dado real de cliente** deve passar por aqui.

---

### A5. Evolution API com chave versionada e porta publicada

**Onde:** `docker-compose.yml:53-63`

```yaml
ports:
  - "8080:8080"
environment:
  AUTHENTICATION_API_KEY: "mercado-evolution-dev-key"
```

A chave de API está **em texto puro no repositório** (já publicada no
histórico do Git) e a porta 8080 é publicada no host.

**Impacto:** quem alcançar a porta 8080 com essa chave controla a instância de
WhatsApp da loja — pode ler mensagens recebidas, **enviar mensagens em nome da
empresa**, criar/apagar instâncias e obter o QR Code para parear novos
dispositivos. É o ativo mais sensível da stack.

**Correção:**
1. Mover a chave para o `.env` (já gitignored): `AUTHENTICATION_API_KEY: ${EVOLUTION_API_KEY}`.
2. **Rotacionar a chave atual** — considere-a comprometida por estar no histórico.
3. Não publicar a porta 8080: remover o mapeamento e deixar a Evolution acessível
   só pela rede interna do Docker (o backend também deveria ir para o compose).
4. Se precisar de acesso externo, colocar atrás de proxy com TLS e IP allowlist.

---

## 4. Vulnerabilidades — severidade MÉDIA

### M1. Refresh tokens e tokens de reset armazenados em texto puro

**Onde:** `token.service.ts:80` · `auth.service.ts:55-58`

```ts
await this.prisma.refreshToken.create({ data: { token, usuarioId, expiraEm } });
```

Um vazamento de backup, um acesso de leitura ao banco ou uma futura falha de
injeção entregam sessões ativas prontas para uso — e, no caso do token de
reset, permitem **tomada de conta** sem conhecer a senha.

**Correção:** persistir `sha256(token)` e comparar pelo hash. O token completo
só existe em trânsito.

### M2. Reset de senha não revoga as sessões existentes

**Onde:** `auth.service.ts:63-72`

Trocar a senha não invalida refresh tokens emitidos antes. Se o usuário troca a
senha justamente porque suspeita de invasão, o atacante mantém acesso por até
7 dias.

**Correção:** `revogado: true` em todos os refresh tokens do usuário dentro do
`resetPassword` (e também na troca de senha autenticada).

### M3. Política de senha fraca

**Onde:** `auth.dto.ts:11,34` · `create-user.dto.ts:17` — apenas `@MinLength(6)`.

Sem exigência de complexidade, sem verificação contra listas de senhas vazadas,
sem expiração. `senha123` é aceita.

**Correção:** mínimo de 10-12 caracteres, `@Matches` para complexidade, e
idealmente checagem contra a API k-anonymity do Have I Been Pwned.

### M4. Filtro de exceções devolve mensagem interna ao cliente

**Onde:** `all-exceptions.filter.ts:53-56`

```ts
} else if (exception instanceof Error) {
  message = exception.message;   // ← devolvido no corpo da resposta 500
```

Erros não mapeados expõem a mensagem original — que pode conter caminhos de
arquivo, nomes de tabela/coluna ou detalhes de bibliotecas úteis a um atacante.

**Correção:** logar a mensagem real, mas responder `'Erro interno do servidor'`
quando `status >= 500` e `NODE_ENV === 'production'`.

### M5. PostgreSQL com credenciais triviais e porta publicada

**Onde:** `docker-compose.yml:7-11` — usuário `mercado`, senha `mercado`, `5432:5432`.

O usuário da aplicação é dono do banco (pode `DROP TABLE`), a senha é trivial e
a porta está exposta no host. Sem SSL, sem `pg_hba.conf` restritivo, sem
política de backup definida.

**Correção (produção):** senha forte via `.env`; não publicar a porta (só rede
interna do compose); usuário da aplicação sem privilégios de DDL; `sslmode=require`;
backups criptografados e testados.

### M6. Segredo do webhook trafega em query string

**Onde:** `docker-compose.yml:83` — `...?secret=${WEBHOOK_SECRET}`

Query strings aparecem em logs de acesso, histórico de proxies e cabeçalhos
`Referer`. O controller **já aceita** o cabeçalho `x-webhook-secret`
(`evolution-webhook.controller.ts:59`), que é a via correta.

**Correção:** configurar a Evolution para enviar o segredo por cabeçalho
(`WEBHOOK_GLOBAL_HEADERS`) e remover o parâmetro da URL.

### M7. Tentativas de login malsucedidas não são auditadas

**Onde:** `audit.interceptor.ts:47-59`

O registro acontece dentro de `tap()`, que só executa no caminho de **sucesso**
do Observable. Requisições que lançam exceção — exatamente as tentativas de
login falhas, acessos negados por RBAC e violações de regra — não geram
registro de auditoria.

**Impacto:** OWASP A09 (Falhas de Log e Monitoramento). Não há trilha para
detectar força bruta ou tentativa de escalada de privilégio.

**Correção:** trocar `tap(onNext)` por `tap({ next, error })` e registrar
também o caminho de erro, com o status resultante.

### M8. Rate limiting em memória e sem `trust proxy`

**Onde:** `app.module.ts:34` — `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])`

- Armazenamento em memória: não é compartilhado entre réplicas e zera a cada
  reinício — um atacante consegue mais tentativas do que o limite sugere.
- Sem `app.set('trust proxy', ...)`: atrás de um proxy reverso, ou todos os
  clientes compartilham o IP do proxy (bloqueio coletivo acidental), ou o
  cliente consegue forjar `X-Forwarded-For` e escapar do limite.

**Correção:** `ThrottlerStorageRedisService` (o Redis já existe na stack) e
`trust proxy` configurado conforme a topologia real.

### M9. Sem bloqueio de conta por tentativas repetidas

O único freio no login é `@Throttle({ limit: 5, ttl: 60_000 })` por IP
(`auth.controller.ts:20`). Não há bloqueio progressivo por **conta**, então um
ataque distribuído (vários IPs) contra um e-mail conhecido não encontra
resistência — agravado por M3 (senha de 6 caracteres).

**Correção:** contador de falhas por usuário com backoff exponencial e
bloqueio temporário; notificar o titular.

### M10. Dependências com vulnerabilidades conhecidas

| Pacote | Sev. | Problema | Caminho |
| --- | --- | --- | --- |
| `brace-expansion` | Alta | DoS por expansão ilimitada (OOM) | `exceljs` → `archiver` → `glob` |
| `minimatch` / `glob` / `rimraf` | Alta | cadeia da mesma raiz | idem |
| `uuid` | Moderada | falta de checagem de limites em v3/v5/v6 | direta |
| `react-router` | Alta | bypass de CSRF em modo RSC | `react-router-dom` |

Backend: 10 vulnerabilidades (9 altas). Frontend: 3 altas.

**Nota de contexto:** o `react-router` só é explorável em **modo RSC**, que
este projeto não usa — o risco real é baixo, mas o `npm audit fix` é trivial.
A cadeia do `exceljs` é usada na geração de relatórios; o DoS exigiria entrada
controlada pelo atacante chegando ao glob, o que não parece ocorrer aqui.

**Correção:** `npm audit fix` no frontend (não-quebrante). No backend, avaliar
a atualização do `exceljs` (é breaking) e adicionar `npm audit` ao CI.

---

## 5. Vulnerabilidades — severidade BAIXA

- **B1. Swagger público em `/docs`** (`main.ts`): exposto sem verificação de
  ambiente; entrega o mapa completo da API. Condicionar a `NODE_ENV !== 'production'`.
- **B2. Senha padrão do seed** (`prisma/seed.ts:8`): `Admin@123` como fallback.
  Aceitável em dev; em produção, forçar troca no primeiro login.
- **B3. pgAdmin com `admin`/`admin`** (`docker-compose.yml:31-32`): mitigado por
  estar no profile `tools` (não sobe por padrão), mas deve sair do compose de produção.
- **B4. Ausência de MFA** para perfis administrativos.
- **B5. `/auth/refresh` e `/auth/reset-password` sem `@Throttle` específico** —
  herdam apenas o limite global de 100/min.

---

## 6. Testes que **não** encontraram problemas

Vale registrar o que foi verificado e está correto:

| Verificação | Resultado |
| --- | --- |
| SQL Injection | ✅ Prisma parametrizado; único `$queryRaw` é `SELECT 1` estático (`health.controller.ts:17`) |
| XSS refletido / DOM | ✅ Nenhum `dangerouslySetInnerHTML` ou `innerHTML=` no frontend; React escapa por padrão |
| Mass assignment | ✅ `whitelist: true` + `forbidNonWhitelisted: true` no `ValidationPipe` global |
| Hashing de senha | ✅ Argon2 (`hashing.service.ts`) — escolha atual recomendada |
| RBAC | ✅ Guards globais na ordem correta; `@Public()` explícito (fail-secure) |
| Enumeração de usuários | ✅ Mensagem genérica no login e no forgot-password |
| IDOR em pedidos | ✅ `trackingToken` é UUID v4 aleatório, não sequencial |
| Vazamento no catálogo público | ✅ Não expõe `precoCompra` nem estoque exato — só faixa de disponibilidade |
| Sanitização de auditoria | ✅ `SENSITIVE_KEYS` remove senha/tokens antes de persistir |
| Webhook | ✅ Fail-closed sem segredo + `timingSafeEqual` (resistente a timing attack) |
| Rotação de refresh token | ✅ Token usado é revogado a cada rotação |
| Secrets no Git | ✅ `.env` no `.gitignore`; nenhum `.env` real rastreado |
| Path traversal em upload | ✅ `extname()` não permite `../`; nome-base é UUID |
| Command injection / SSRF | ✅ Nenhum `exec`/`spawn`; única saída HTTP é a URL fixa da Evolution |

---

## 7. Plano de remediação priorizado

### Fase 1 — antes de qualquer exposição pública (bloqueante) — ✅ concluída

1. ✅ **A1** Upload reescrito: `memoryStorage` (nada não validado toca o disco),
   verificação de **magic bytes**, extensão derivada do formato detectado no
   servidor, `originalname` descartado e **SVG removido** da allowlist.
2. ✅ **A3** `helmet` configurado com CSP restritiva para a API/uploads e CSP
   própria para o Swagger; uploads passaram a responder com `nosniff` e
   `Content-Security-Policy: default-src 'none'; sandbox`.
3. ✅ **A5** Chave da Evolution movida para `.env`, **rotacionada**, e porta
   `8080` restrita a `127.0.0.1`.
4. ✅ **A4** Não aplicável ao ambiente local (exige domínio e certificado).
   Topologia, proxy com TLS e checklist documentados em
   [12-deploy-producao.md](12-deploy-producao.md).
5. ✅ **M5** Porta do Postgres restrita a `127.0.0.1` e senha parametrizada por
   `.env`. A troca do valor em banco já existente exige `ALTER USER` — ver
   [12-deploy-producao.md §4](12-deploy-producao.md#4-senha-do-postgresql-em-banco-já-existente).

> Bônus fora da Fase 1: pgAdmin também teve a senha parametrizada e a porta
> restrita a `127.0.0.1`.

### Fase 2 — endurecimento de sessão (curto prazo) — ✅ concluída

6. ✅ **M1** Refresh tokens e tokens de reset passam a ser gravados como digest
   SHA-256 (`HashingService.tokenDigest`). O valor em claro só existe em
   trânsito — no cookie/resposta e no e-mail de recuperação.
7. ✅ **M2** Redefinir senha revoga todas as sessões. Estendido também à troca
   de senha e ao **rebaixamento de perfil** feitos por um administrador, que
   antes deixavam o token antigo circulando com o papel anterior.
8. ✅ **M4** Erros não mapeados respondem `Erro interno do servidor`; a mensagem
   original fica apenas no log do servidor.
9. ✅ **M7** Auditoria passa a registrar o caminho de erro
   (`tap({ next, error })`), com a ação marcada `[FALHA]` — login malsucedido,
   403 do RBAC e violação de regra agora deixam rastro.
10. ✅ **M3** Política de senha aplicada por `@SenhaForte()`: mínimo de 10
    caracteres com maiúscula, minúscula e número, e teto de 128 (evita DoS de
    CPU no argon2). Espelhada no frontend em `lib/password.ts`. **Não** vale
    para o login, onde só se confere o hash — senhas antigas seguem válidas.

> **Efeito colateral esperado no deploy:** como os tokens passam a ser
> comparados por digest, os refresh tokens emitidos antes desta mudança deixam
> de casar e **todos os usuários precisarão entrar novamente**. É o
> comportamento desejado para uma correção de sessão.

### Fase 3 — robustez e operação (médio prazo) — ✅ concluída

11. ✅ **A2** Refresh token migrado para cookie `HttpOnly; SameSite=Lax`, restrito
    ao path `/api/v1/auth` (`refresh-cookie.ts`). O access token agora vive só
    em memória do lado do frontend (`useAuthStore` não persiste mais tokens no
    `localStorage`, só o perfil do usuário) — um XSS deixa de ter qualquer
    token persistido para roubar. `App.tsx` restaura a sessão no boot trocando
    o cookie por um access token novo (`restoreSession`), e `ProtectedRoute`
    espera esse processo (`sessionReady`) antes de decidir redirecionar.
12. ✅ **M8** `app.set('trust proxy', ...)` implementado (variável
    `TRUST_PROXY`, vazia em dev). O storage do throttler continua em memória —
    correto para a instância única atual; a migração para Redis fica
    documentada como passo de quando houver 2+ réplicas (ver
    [docs/12 §5](12-deploy-producao.md#5-rate-limiting-em-múltiplas-réplicas)),
    para não adicionar uma dependência sem benefício real hoje.
13. ✅ **M9** Bloqueio progressivo por conta: a partir da 5ª falha, backoff
    exponencial (1min → 2min → 4min..., teto de 30min). Conta bloqueada
    responde com a mesma mensagem genérica de credencial errada — não
    confirma que o bloqueio existe nem que o e-mail é válido. Redefinir a
    senha com sucesso limpa o contador.
14. ⚠️ **M6** Investigado e **parcialmente aceito como risco residual**: a
    Evolution API v2 não expõe uma env var de webhook global para headers
    customizados (confirmado no `.env.example` oficial do projeto — só
    `WEBHOOK_GLOBAL_ENABLED/URL/WEBHOOK_BY_EVENTS`). O suporte a headers existe
    apenas no endpoint por instância, que exigiria uma chamada extra à API
    Evolution depois de cada subida do compose. Documentado o porquê e o
    limite do risco (a URL nunca sai da rede interna) diretamente no
    `docker-compose.yml`.
15. ⚠️ **M10** `npm audit fix` rodado no frontend (3→2 altas). A vulnerabilidade
    restante do `react-router` ainda não tem versão corrigida disponível — o
    projeto já está na última release (7.18.1) e o advisory é específico do
    modo RSC, que este projeto não usa. Backend: cadeia via `exceljs`
    (relatórios) segue sem fix não-quebrante; `exceljs@3.4.0` corrigiria mas é
    breaking change, não aplicado nesta fase.
16. ✅ **B1** Swagger (`/docs`) só sobe fora de produção
    (`NODE_ENV !== 'production'`).

### Fase 4 — conformidade e maturidade — ⚠️ concluída com uma pendência de ambiente

17. ✅ **B4** MFA (TOTP, RFC 6238) implementado por completo: `POST /auth/mfa/setup`
    (gera segredo + QR Code), `/mfa/enable` (confirma e emite 10 códigos de
    recuperação de uso único, mostrados uma única vez), `/mfa/disable` (exige
    senha **e** código — um access token roubado sozinho não desliga a
    proteção), e o login em duas etapas (`mfaRequired`/`mfaToken` →
    `/mfa/verify`). O segredo TOTP é cifrado em repouso (AES-256-GCM,
    `MfaService`) — nunca gravado em claro. **Enforcement é opt-in, não
    mandatório**: ativar é recomendado (nudge no login) para ADMINISTRADOR/
    GERENTE, mas não bloqueia quem ainda não configurou — tornar obrigatório
    exigiria uma janela de migração para as contas já existentes, o que não
    fazia sentido aplicar abruptamente numa sessão de uso ativo. UI completa
    no frontend (`MfaSettingsCard`, tela de login em duas etapas). 21 testes
    novos, unitários, cobrindo bloqueio de força bruta e todo o fluxo de MFA.
19. ✅ **Retenção/exclusão de dados (LGPD)** — novo módulo `LgpdModule`
    (`/lgpd/*`, só `ADMINISTRADOR`): exportação de dados de um cliente (art.
    18 II/V), anonimização (art. 18 VI — desidentifica cadastro e snapshot de
    pedidos, apaga mensagens de WhatsApp do telefone) e expurgo automático de
    `mensagens_whatsapp` além de `RETENCAO_MENSAGENS_DIAS` (90 dias por
    padrão) — o item mais sensível apontado no §8 original. Detalhado em
    [docs/13-lgpd-retencao.md](13-lgpd-retencao.md), que documenta também o
    que ainda falta (consentimento no checkout, anonimização de venda/fiado).
20. ⚠️ **Backups criptografados** — scripts prontos
    (`infra/scripts/backup.sh`/`restore.sh`, AES-256-CBC via OpenSSL,
    `restore.sh` cria um banco de teste separado por padrão em vez de
    sobrescrever o banco em uso). **A restauração não foi testada de ponta a
    ponta nesta sessão** — o Docker Desktop do ambiente ficou indisponível
    (ver nota abaixo) no momento em que esse item seria validado.
21. ⚠️ **Reteste completo** — parcial. Cobri o que dava para verificar sem
    banco: type-check limpo (backend e frontend) e 49/49 testes unitários
    (12 novos de MFA, 7 de LGPD). **Não foi possível** rodar o app de ponta a
    ponta (login real com MFA, migração aplicada, backup restaurado) pelo
    mesmo motivo de infraestrutura.

> **Pendência de ambiente, não de código.** O Docker Desktop travou nesta
> sessão de um jeito que sobreviveu a: matar os processos, `wsl --shutdown`,
> reiniciar, e até `wsl --update` (que rodou e atualizou o WSL2 para 2.7.11,
> mas não resolveu). Isso tipicamente exige um **reinício completo do
> Windows** para o driver/kernel do WSL2 assentar. Depois de reiniciar,
> antes de usar o sistema:
> ```bash
> cd backend
> npx prisma migrate dev --name mfa_e_lgpd
> ```
> Isso aplica as colunas de MFA (`mfaSecretCifrado`, `mfaEnabled`,
> `mfaRecoveryCodesJson`) que já estão em `schema.prisma` mas ainda não
> foram migradas para o banco — `prisma generate` (sem precisar do banco) já
> foi rodado, então o TypeScript compila normalmente; só falta a migração
> em si. Depois de migrar, vale testar manualmente ao menos uma vez: ativar
> o MFA num usuário, fazer logout/login completo, e rodar
> `infra/scripts/backup.sh` seguido de `infra/scripts/restore.sh` num banco
> de teste para validar a dupla antes de confiar nela em produção.

---

## 8. LGPD

O sistema trata dados pessoais de clientes finais: **nome, telefone, endereço
residencial completo, ponto de referência e histórico de compras** (tabelas
`clientes`, `pedidos`, `mensagens_whatsapp`).

| Requisito | Situação | Ação |
| --- | --- | --- |
| Base legal / finalidade | ⚠️ não documentada | Registrar: execução de contrato (pedido) |
| Consentimento | ❌ ausente no checkout | Adicionar aviso de privacidade no catálogo |
| Minimização | ⚠️ parcial | Avaliar necessidade do histórico completo de mensagens |
| Segurança em trânsito | ❌ HTTP puro | Ver A4 — bloqueante para dados reais |
| Segurança em repouso | ⚠️ sem criptografia de coluna | Avaliar cifragem de telefone/endereço |
| Trilha de acesso | ✅ auditoria existe | Estender ao caminho de erro (M7) |
| Retenção / exclusão | ❌ inexistente | Definir prazo e rotina de expurgo |
| Direito do titular | ❌ inexistente | Endpoint de exportação/exclusão a pedido |
| Backup protegido | ❌ não definido | Ver Fase 4 |

**Ponto de atenção específico:** `mensagens_whatsapp` guarda o conteúdo integral
das conversas indefinidamente. É o registro com maior sensibilidade e menor
justificativa de retenção longa — deve ser o primeiro alvo de uma política de
expurgo.

---

## 9. Ferramentas sugeridas para a próxima etapa

Esta revisão foi estática. Para complementar:

| Camada | Ferramenta |
| --- | --- |
| DAST / aplicação | OWASP ZAP (baseline scan), Burp Suite Community |
| Dependências | `npm audit`, Snyk, Dependabot no repositório |
| Containers | Trivy (`trivy image evoapicloud/evolution-api:v2.3.7`), Docker Bench |
| Banco | `pgaudit`, revisão de `pg_hba.conf` |
| Infra | Lynis (host), Nmap (superfície de portas) |
| Frontend | Lighthouse (best practices), CSP Evaluator |

---

*Revisão realizada sobre o commit `2452945`. Recomenda-se novo ciclo de
verificação após a Fase 2 do plano de remediação.*
