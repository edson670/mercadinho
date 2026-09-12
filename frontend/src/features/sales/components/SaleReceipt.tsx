import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { getSettings } from '@/features/settings/api/settings.api';
import { getSale, type SaleDetail } from '../api/sales.api';

const PAGAMENTO_LABEL: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  CARTAO: 'Cartão',
  FIADO: 'Fiado (a prazo)',
};

/**
 * Carrega a venda e dispara a impressão. Usado tanto ao finalizar no PDV
 * quanto na reimpressão pelo histórico.
 *
 * Os dados da empresa são garantidos no cache ANTES de montar o
 * comprovante: se fossem buscados durante a montagem, o primeiro cupom
 * sairia sem o cabeçalho da loja.
 */
export function useComprovante() {
  const qc = useQueryClient();
  const [venda, setVenda] = useState<SaleDetail | null>(null);
  const [carregando, setCarregando] = useState(false);

  const imprimir = useCallback(
    async (vendaId: string) => {
      setCarregando(true);
      try {
        const [detalhe] = await Promise.all([
          getSale(vendaId),
          qc.ensureQueryData({ queryKey: ['settings'], queryFn: getSettings }).catch(() => null),
        ]);
        setVenda(detalhe);
      } finally {
        setCarregando(false);
      }
    },
    [qc],
  );

  // Só chama print() depois que o comprovante já está no DOM. Usa timer, e
  // não requestAnimationFrame: rAF não dispara enquanto a aba não está
  // desenhando, então o cupom só sairia quando a janela voltasse à frente.
  useEffect(() => {
    if (!venda) return;
    const id = setTimeout(() => window.print(), 50);
    return () => clearTimeout(id);
  }, [venda]);

  return { venda, imprimir, carregando };
}

/** Quantidade sem casas decimais inúteis: 2 em vez de 2,000; 1,5 quando é fracionado. */
function formatQtd(qtd: number): string {
  return Number.isInteger(qtd) ? String(qtd) : qtd.toFixed(3).replace(/0+$/, '').replace('.', ',');
}

/**
 * Comprovante de venda no formato de bobina térmica (80mm).
 *
 * Fica sempre montado, mas escondido na tela: só aparece em `@media print`
 * (ver globals.css). Imprimir é `window.print()` — assim funciona com
 * qualquer impressora instalada no sistema, sem driver nem servidor de
 * impressão, e o operador ainda pode escolher "salvar em PDF".
 *
 * Não é documento fiscal: é o comprovante de atendimento do mercadinho.
 */
export function SaleReceipt({ venda }: { venda: SaleDetail }) {
  const { data: empresa } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    staleTime: 5 * 60_000,
    retry: false,
  });

  return (
    <div id="comprovante-venda" className="hidden print:block">
      <div className="recibo">
        <header className="recibo-centro">
          <p className="recibo-titulo">{empresa?.nome ?? 'Mercadinho'}</p>
          {empresa?.cnpj && <p>CNPJ {empresa.cnpj}</p>}
          {empresa?.endereco && <p>{empresa.endereco}</p>}
          {empresa?.telefone && <p>Tel. {empresa.telefone}</p>}
        </header>

        <div className="recibo-separador" />

        <p>
          <strong>Venda #{venda.numero}</strong>
        </p>
        <p>{formatDateTime(venda.data)}</p>
        {venda.usuarioNome && <p>Operador: {venda.usuarioNome}</p>}
        {venda.clienteNome && <p>Cliente: {venda.clienteNome}</p>}

        <div className="recibo-separador" />

        <table className="recibo-itens">
          <tbody>
            {venda.itens.map((item) => (
              <tr key={item.produtoId}>
                <td colSpan={2}>
                  {item.produtoNome}
                  <br />
                  <span className="recibo-detalhe">
                    {formatQtd(item.quantidade)} x {formatCurrency(item.precoUnitario)}
                  </span>
                </td>
                <td className="recibo-valor">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="recibo-separador" />

        <table className="recibo-totais">
          <tbody>
            <tr>
              <td>Subtotal</td>
              <td className="recibo-valor">{formatCurrency(venda.subtotal)}</td>
            </tr>
            {venda.desconto > 0 && (
              <tr>
                <td>Desconto</td>
                <td className="recibo-valor">- {formatCurrency(venda.desconto)}</td>
              </tr>
            )}
            <tr className="recibo-total">
              <td>TOTAL</td>
              <td className="recibo-valor">{formatCurrency(venda.total)}</td>
            </tr>
            <tr>
              <td>Pagamento</td>
              <td className="recibo-valor">
                {PAGAMENTO_LABEL[venda.formaPagamento] ?? venda.formaPagamento}
              </td>
            </tr>
          </tbody>
        </table>

        {venda.formaPagamento === 'FIADO' && (
          <>
            <div className="recibo-separador" />
            <p className="recibo-centro">
              <strong>COMPRA A PRAZO</strong>
              <br />
              Valor lançado na conta do cliente.
            </p>
          </>
        )}

        {venda.status === 'CANCELADA' && (
          <>
            <div className="recibo-separador" />
            <p className="recibo-centro">
              <strong>*** VENDA CANCELADA ***</strong>
            </p>
          </>
        )}

        <div className="recibo-separador" />
        <p className="recibo-centro recibo-detalhe">
          Obrigado pela preferência!
          <br />
          Não é documento fiscal.
        </p>
      </div>
    </div>
  );
}
