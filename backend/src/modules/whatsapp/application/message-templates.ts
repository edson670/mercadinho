import { FormaPagamentoPedido, StatusPedido } from '@prisma/client';
import { formatCurrency } from '@core/common/format.util';

const PAGAMENTO_LABEL: Record<FormaPagamentoPedido, string> = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO_CREDITO: 'Cartão de crédito',
  CARTAO_DEBITO: 'Cartão de débito',
};

export interface ItemResumo {
  nomeProduto: string;
  quantidade: number;
  subtotal: number;
}

export interface EnderecoResumo {
  logradouro: string;
  numeroEndereco: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  referencia?: string | null;
}

export interface PedidoResumo {
  numero: number;
  itens: ItemResumo[];
  total: number;
  formaPagamento: FormaPagamentoPedido;
  trocoPara: number | null;
  endereco: EnderecoResumo;
  /** Link de acompanhamento — sem ele o cliente perde o pedido ao fechar a aba. */
  linkAcompanhamento?: string;
  /** Chave PIX da loja, quando o pedido for pago em PIX. */
  chavePix?: string | null;
}

/** Quantidade sem casas decimais desnecessárias (2 em vez de 2.000). */
function qtd(valor: number): string {
  return Number.isInteger(valor) ? String(valor) : String(valor).replace('.', ',');
}

/** Primeiro nome — "Olá, José Edson" soa a formulário; "Olá, José" soa a atendimento. */
function primeiroNome(nome?: string): string | undefined {
  const limpo = nome?.trim().split(/\s+/)[0];
  if (!limpo || limpo.length < 2) return undefined;
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

function enderecoEmLinha(e: EnderecoResumo): string {
  const complemento = e.complemento?.trim() ? `, ${e.complemento.trim()}` : '';
  return `${e.logradouro}, ${e.numeroEndereco}${complemento} — ${e.bairro}, ${e.cidade}`;
}

export function saudacaoComCatalogo(
  empresa: string,
  link: string,
  opcoes: { nome?: string; validadeHoras?: number; jaCliente?: boolean } = {},
): string {
  const nome = primeiroNome(opcoes.nome);
  const validade = opcoes.validadeHoras;
  // "de volta" só para quem já tem cadastro. O nome pode vir do perfil do
  // WhatsApp (pushName), e aí saudar um cliente novo como recorrente soa falso.
  const boasVindas = opcoes.jaCliente ? 'Bem-vindo(a) de volta' : 'Bem-vindo(a)';

  return [
    nome
      ? `Olá, ${nome}! 👋 ${boasVindas} ao *${empresa}*.`
      : `Olá! 👋 Bem-vindo(a) ao *${empresa}*.`,
    '',
    'Monte seu pedido pelo nosso catálogo:',
    link,
    '',
    'É rapidinho: escolha os produtos, confirme o endereço e pronto! 🛒',
    // O link vence em algumas horas. Sem esse aviso o cliente só descobria
    // depois de montar o carrinho inteiro e levar erro no checkout.
    ...(validade
      ? [
          '',
          `⏱️ O link vale por ${validade}h. Depois disso, é só mandar outra mensagem que enviamos um novo.`,
        ]
      : []),
  ].join('\n');
}

export function pedidoRecebido(pedido: PedidoResumo): string {
  const linhas = pedido.itens.map(
    (i) => `• ${qtd(i.quantidade)}x ${i.nomeProduto} — ${formatCurrency(i.subtotal)}`,
  );

  const emDinheiro = pedido.formaPagamento === FormaPagamentoPedido.DINHEIRO;
  // O troco calculado poupa a conta na porta — para o cliente e para o entregador.
  const troco = emDinheiro && pedido.trocoPara ? pedido.trocoPara - pedido.total : null;
  const pagamento =
    emDinheiro && pedido.trocoPara
      ? `${PAGAMENTO_LABEL[pedido.formaPagamento]} — leve ${formatCurrency(pedido.trocoPara)}` +
        (troco && troco > 0 ? ` (troco de ${formatCurrency(troco)})` : ' (valor exato)')
      : PAGAMENTO_LABEL[pedido.formaPagamento];

  const ehPix = pedido.formaPagamento === FormaPagamentoPedido.PIX;

  return [
    '✅ *Pedido recebido!*',
    '',
    `*Pedido Nº ${pedido.numero}*`,
    '',
    ...linhas,
    '',
    `*Total: ${formatCurrency(pedido.total)}*`,
    `Pagamento: ${pagamento}`,
    // Endereço de volta para o cliente: erro de entrega quase sempre nasce de
    // um número ou bairro digitado errado, e aqui ele ainda dá tempo de avisar.
    '',
    '📍 *Entrega em:*',
    enderecoEmLinha(pedido.endereco),
    ...(pedido.endereco.referencia?.trim()
      ? [`Referência: ${pedido.endereco.referencia.trim()}`]
      : []),
    ...(ehPix && pedido.chavePix
      ? ['', '💠 *Pague com PIX:*', pedido.chavePix, `Valor: ${formatCurrency(pedido.total)}`]
      : []),
    ...(pedido.linkAcompanhamento
      ? ['', 'Acompanhe seu pedido por aqui:', pedido.linkAcompanhamento]
      : []),
    '',
    'Já estamos separando tudo. Se algo estiver errado, responda esta mensagem. 🛒',
  ].join('\n');
}

export interface ContextoStatus {
  linkAcompanhamento?: string;
}

const STATUS_TEXTO: Partial<Record<StatusPedido, (numero: number, ctx: ContextoStatus) => string>> =
  {
    [StatusPedido.EM_SEPARACAO]: (n) =>
      `🧺 Seu pedido *Nº ${n}* entrou em separação. Avisamos assim que sair para entrega.`,
    [StatusPedido.SAIU_PARA_ENTREGA]: (n, ctx) =>
      [
        `🚚 Seu pedido *Nº ${n}* saiu para entrega! Já já chega aí.`,
        // Só aqui o link importa de verdade: é o momento em que o cliente fica
        // olhando o relógio. Nos outros status ele só polui a mensagem.
        ...(ctx.linkAcompanhamento ? ['', 'Acompanhe:', ctx.linkAcompanhamento] : []),
        '',
        'Deixe o telefone por perto para o entregador te encontrar. 📲',
      ].join('\n'),
    [StatusPedido.ENTREGUE]: (n) =>
      `✅ Pedido *Nº ${n}* entregue. Obrigado pela preferência! 💚\n\nQualquer coisa é só chamar aqui — e quando quiser pedir de novo, mande uma mensagem que enviamos o catálogo.`,
    [StatusPedido.CANCELADO]: (n) =>
      `❌ Seu pedido *Nº ${n}* foi cancelado e nada será cobrado.\n\nSe não foi você quem pediu o cancelamento, responda esta mensagem que a gente resolve.`,
  };

/** Retorna null para status sem mensagem ao cliente (ex.: RECEBIDO já foi avisado). */
export function statusAtualizado(
  status: StatusPedido,
  numero: number,
  ctx: ContextoStatus = {},
): string | null {
  return STATUS_TEXTO[status]?.(numero, ctx) ?? null;
}
