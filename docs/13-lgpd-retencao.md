# 13 — LGPD: retenção e direitos do titular

Implementa os itens 18 (política de retenção/exclusão) e complementa o §8 da
[análise de segurança](11-analise-seguranca.md#8-lgpd), que apontou
`mensagens_whatsapp` como o dado mais sensível do sistema sem prazo de
retenção definido.

## 1. Dados pessoais tratados

| Onde | O quê | Retenção |
| --- | --- | --- |
| `clientes` | Nome, CPF, telefone, endereço | Enquanto o cliente for ativo (sem prazo automático — ver §3) |
| `pedidos` | Snapshot de nome/telefone/endereço no momento da compra | Indefinida (obrigação fiscal/contábil) |
| `mensagens_whatsapp` | Conteúdo integral das conversas | **90 dias** (configurável, `RETENCAO_MENSAGENS_DIAS`) |
| `usuarios` | Dados dos funcionários (não é dado de cliente/titular externo) | Enquanto empregado |

`pedidos` guarda um **snapshot imutável** do endereço/telefone (ADR A3, ver
`docs/10-pedidos-whatsapp.md`) — é histórico de transação, não cadastro vivo.
Por isso a anonimização (§2) desidentifica o snapshot em vez de apagar o
pedido: a venda em si tem relevância fiscal/contábil que sobrevive à
anonimização do titular.

## 2. Direitos do titular (LGPD art. 18)

Endpoints em `POST/GET /api/v1/lgpd/*` (só `ADMINISTRADOR`, ver
`LgpdController`). Não há tela própria no frontend — em um sistema deste porte,
pedidos de titular são raros o bastante para serem tratados via Swagger
(`/docs`, fora de produção) ou uma chamada direta à API pelo administrador.

### Exportação (`GET /lgpd/clientes/:id/exportar`)

Devolve em JSON: dados cadastrais, pedidos, vendas e todo o histórico de
mensagens de WhatsApp associado ao telefone do cliente. Atende ao direito de
acesso/portabilidade (art. 18, II e V).

### Anonimização (`POST /lgpd/clientes/:id/anonimizar`)

Atende ao direito de eliminação (art. 18, VI). **Ação irreversível.** O que
acontece:

- `Cliente`: nome vira "Cliente anonimizado"; CPF, telefone, endereço e
  observações são zerados; conta marcada inativa.
- `MensagemWhatsApp`: todas as mensagens do telefone são **apagadas**.
- `Pedido`: o snapshot de nome/telefone/endereço é desidentificado — total,
  itens, status e forma de pagamento permanecem (é o que sustenta a
  obrigação contábil).
- `Venda`/`Fiado`: **não são alterados** nesta versão — se o cliente tiver
  histórico de fiado em aberto, resolva-o antes de anonimizar (a cobrança
  fica órfã de dados de contato).

## 3. Retenção automática de mensagens (`POST /lgpd/expurgo-mensagens`)

Remove mensagens de WhatsApp com mais de `RETENCAO_MENSAGENS_DIAS` (padrão 90).
Pensado para rodar por um agendador externo — o backend não tem um scheduler
próprio embutido.

**Windows (Agendador de Tarefas)** — criar uma tarefa diária:
```powershell
$acao = New-ScheduledTaskAction -Execute "curl.exe" -Argument '-X POST http://localhost:3000/api/v1/lgpd/expurgo-mensagens -H "Authorization: Bearer <token-de-servico>"'
$gatilho = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -TaskName "MercadinhoExpurgoLGPD" -Action $acao -Trigger $gatilho
```

**Linux/produção (cron)**:
```cron
0 3 * * * curl -sf -X POST https://seu-dominio/api/v1/lgpd/expurgo-mensagens -H "Authorization: Bearer $TOKEN_SERVICO"
```

> Em ambos os casos, o token usado precisa pertencer a um `ADMINISTRADOR` — não
> há um mecanismo de "service account" separado ainda; usar as credenciais de
> um administrador dedicado a tarefas automatizadas, não o admin humano do
> dia a dia.

## 4. O que ainda falta (fora do escopo desta fase)

- **Consentimento explícito no checkout do catálogo**: hoje o cliente informa
  os dados para receber o pedido, mas não há um aviso de privacidade/consentimento
  formal na tela.
- **Anonimização de `Venda`/`Fiado`**: se o cliente tiver histórico de vendas
  presenciais ou fiado, a anonimização do cadastro não propaga para lá.
- **Service account dedicado** para chamadas automatizadas (cron), em vez de
  reusar credenciais de um administrador humano.
