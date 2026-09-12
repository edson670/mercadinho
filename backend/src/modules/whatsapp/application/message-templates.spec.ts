import { FormaPagamentoPedido, StatusPedido } from '@prisma/client';
import { formatCurrency } from '@core/common/format.util';
import {
  pedidoRecebido,
  saudacaoComCatalogo,
  statusAtualizado,
  type PedidoResumo,
} from './message-templates';

const ENDERECO = {
  logradouro: 'Rua das Flores',
  numeroEndereco: '123',
  complemento: 'Apto 402, Bloco B',
  bairro: 'Centro',
  cidade: 'São Paulo',
  referencia: null,
};

function pedido(over: Partial<PedidoResumo> = {}): PedidoResumo {
  return {
    numero: 42,
    itens: [
      { nomeProduto: 'Arroz 5kg', quantidade: 2, subtotal: 50 },
      { nomeProduto: 'Banana', quantidade: 1.5, subtotal: 7.5 },
    ],
    total: 57.5,
    formaPagamento: FormaPagamentoPedido.PIX,
    trocoPara: null,
    endereco: ENDERECO,
    ...over,
  };
}

describe('saudacaoComCatalogo', () => {
  it('usa o primeiro nome quando o cliente já é conhecido', () => {
    const texto = saudacaoComCatalogo('Mercadinho', 'https://x/y', { nome: 'josé edson silva' });

    expect(texto).toContain('Olá, José!');
    expect(texto).not.toContain('Edson');
  });

  it('só trata como recorrente quem já tem cadastro', () => {
    // O nome pode vir do perfil do WhatsApp; sem cadastro não é "de volta".
    expect(saudacaoComCatalogo('Mercadinho', 'https://x/y', { nome: 'Maria' })).not.toContain(
      'de volta',
    );
    expect(
      saudacaoComCatalogo('Mercadinho', 'https://x/y', { nome: 'Maria', jaCliente: true }),
    ).toContain('de volta');
  });

  it('cai na saudação neutra quando não há nome utilizável', () => {
    expect(saudacaoComCatalogo('Mercadinho', 'https://x/y')).toContain('Olá! 👋');
    // Inicial solta ("J.") não é nome — saudar com ela fica pior que não saudar.
    expect(saudacaoComCatalogo('Mercadinho', 'https://x/y', { nome: 'J' })).toContain('Olá! 👋');
  });

  it('avisa a validade do link para o cliente não montar o carrinho à toa', () => {
    expect(saudacaoComCatalogo('Mercadinho', 'https://x/y', { validadeHoras: 2 })).toContain(
      'O link vale por 2h',
    );
  });
});

describe('pedidoRecebido', () => {
  it('devolve o endereço para o cliente conferir antes da saída', () => {
    const texto = pedidoRecebido(pedido());

    expect(texto).toContain('Rua das Flores, 123, Apto 402, Bloco B — Centro, São Paulo');
  });

  it('inclui o link de acompanhamento quando informado', () => {
    const texto = pedidoRecebido(
      pedido({ linkAcompanhamento: 'https://loja/catalogo/pedido/abc' }),
    );

    expect(texto).toContain('https://loja/catalogo/pedido/abc');
  });

  it('envia a chave PIX apenas em pedidos pagos em PIX', () => {
    expect(pedidoRecebido(pedido({ chavePix: 'loja@email.com' }))).toContain('loja@email.com');

    const dinheiro = pedidoRecebido(
      pedido({
        formaPagamento: FormaPagamentoPedido.DINHEIRO,
        trocoPara: 100,
        chavePix: 'loja@email.com',
      }),
    );
    expect(dinheiro).not.toContain('loja@email.com');
  });

  it('calcula o troco em vez de deixar a conta para a porta', () => {
    const texto = pedidoRecebido(
      pedido({ formaPagamento: FormaPagamentoPedido.DINHEIRO, trocoPara: 100 }),
    );

    expect(texto).toContain(`leve ${formatCurrency(100)}`);
    expect(texto).toContain(`troco de ${formatCurrency(42.5)}`);
  });

  it('diz "valor exato" quando o cliente leva o valor cravado', () => {
    const texto = pedidoRecebido(
      pedido({ formaPagamento: FormaPagamentoPedido.DINHEIRO, trocoPara: 57.5 }),
    );

    expect(texto).toContain('valor exato');
    expect(texto).not.toContain('troco de');
  });

  it('mostra quantidade fracionada com vírgula e inteira sem casas', () => {
    const texto = pedidoRecebido(pedido());

    expect(texto).toContain('2x Arroz 5kg');
    expect(texto).toContain('1,5x Banana');
  });

  it('omite a referência quando ela não foi preenchida', () => {
    expect(pedidoRecebido(pedido())).not.toContain('Referência:');
    expect(
      pedidoRecebido(pedido({ endereco: { ...ENDERECO, referencia: 'Portão azul' } })),
    ).toContain('Referência: Portão azul');
  });
});

describe('statusAtualizado', () => {
  it('não manda mensagem para RECEBIDO (já avisado na confirmação)', () => {
    expect(statusAtualizado(StatusPedido.RECEBIDO, 1)).toBeNull();
  });

  it('põe o link só em "saiu para entrega", que é quando o cliente acompanha', () => {
    const ctx = { linkAcompanhamento: 'https://loja/catalogo/pedido/abc' };

    expect(statusAtualizado(StatusPedido.SAIU_PARA_ENTREGA, 7, ctx)).toContain(
      ctx.linkAcompanhamento,
    );
    expect(statusAtualizado(StatusPedido.EM_SEPARACAO, 7, ctx)).not.toContain(
      ctx.linkAcompanhamento,
    );
  });

  it('tranquiliza sobre cobrança ao cancelar', () => {
    expect(statusAtualizado(StatusPedido.CANCELADO, 7)).toContain('nada será cobrado');
  });
});
