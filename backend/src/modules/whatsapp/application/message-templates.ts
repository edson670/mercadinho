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

export interface PedidoResumo {
  numero: number;
  itens: ItemResumo[];
  total: number;
  formaPagamento: FormaPagamentoPedido;
  trocoPara: number | null;
}

/** Quantidade sem casas decimais desnecessárias (2 em vez de 2.000). */
function qtd(valor: number): string {
  return Number.isInteger(valor) ? String(valor) : String(valor).replace('.', ',');
}

export function saudacaoComCatalogo(empresa: string, link: string): string {
  return [
    `Olá! 👋 Bem-vindo(a) ao *${empresa}*.`,
    '',
    'Monte seu pedido pelo nosso catálogo:',
    link,
    '',
    'É rapidinho: escolha os produtos, informe o endereço e pronto! 🛒',
  ].join('\n');
}

export function pedidoRecebido(pedido: PedidoResumo): string {
  const linhas = pedido.itens.map(
    (i) => `• ${qtd(i.quantidade)}x ${i.nomeProduto} — ${formatCurrency(i.subtotal)}`,
  );

  const pagamento =
    pedido.formaPagamento === FormaPagamentoPedido.DINHEIRO && pedido.trocoPara
      ? `${PAGAMENTO_LABEL[pedido.formaPagamento]} (troco para ${formatCurrency(pedido.trocoPara)})`
      : PAGAMENTO_LABEL[pedido.formaPagamento];

  return [
    '✅ *Pedido recebido!*',
    '',
    `*Pedido Nº ${pedido.numero}*`,
    '',
    ...linhas,
    '',
    `*Total: ${formatCurrency(pedido.total)}*`,
    `Pagamento: ${pagamento}`,
    '',
    'Seu pedido está sendo separado. Avisaremos a cada etapa. 🛒',
  ].join('\n');
}

const STATUS_TEXTO: Partial<Record<StatusPedido, (numero: number) => string>> = {
  [StatusPedido.EM_SEPARACAO]: (n) =>
    `🧺 Seu pedido *Nº ${n}* entrou em separação.`,
  [StatusPedido.SAIU_PARA_ENTREGA]: (n) =>
    `🚚 Seu pedido *Nº ${n}* saiu para entrega! Já já chega aí.`,
  [StatusPedido.ENTREGUE]: (n) =>
    `✅ Pedido *Nº ${n}* entregue. Obrigado pela preferência! 💚`,
  [StatusPedido.CANCELADO]: (n) =>
    `❌ Seu pedido *Nº ${n}* foi cancelado. Qualquer dúvida, é só chamar por aqui.`,
};

/** Retorna null para status sem mensagem ao cliente (ex.: RECEBIDO já foi avisado). */
export function statusAtualizado(status: StatusPedido, numero: number): string | null {
  return STATUS_TEXTO[status]?.(numero) ?? null;
}
