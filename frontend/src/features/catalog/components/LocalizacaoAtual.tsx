import { useState } from 'react';
import { ExternalLink, Loader2, MapPin, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MENSAGEM_FALHA,
  obterCoordenadas,
  reverseGeocode,
  urlMapaEmbutido,
  urlMapaExterno,
  type EnderecoPorLocalizacao,
  type MotivoFalhaLocalizacao,
} from '../api/geocoding.api';

interface Props {
  /** Recebe o endereço resolvido para preencher o formulário. */
  onEndereco: (endereco: EnderecoPorLocalizacao) => void;
}

/**
 * Preenche o endereço de entrega pela localização do aparelho — o cliente
 * só completa apartamento e bloco depois.
 *
 * O mapa entra como conferência: GPS em área urbana erra facilmente de
 * dezenas de metros, e a geocodificação pode acertar a rua e errar o número.
 * Ver o pino é o que permite ao cliente perceber e corrigir antes de enviar.
 */
export function LocalizacaoAtual({ onEndereco }: Props) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<EnderecoPorLocalizacao | null>(null);

  const usarLocalizacao = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const posicao = await obterCoordenadas();
      const endereco = await reverseGeocode(posicao.coords.latitude, posicao.coords.longitude);
      setResultado(endereco);
      onEndereco(endereco);
      if (!endereco.encontrado) {
        setErro('Achamos sua localização, mas não o endereço. Confira os campos abaixo.');
      }
    } catch (e) {
      const motivo = e as MotivoFalhaLocalizacao;
      setErro(
        MENSAGEM_FALHA[motivo] ??
          'Não foi possível usar sua localização. Digite o endereço abaixo.',
      );
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={usarLocalizacao}
        disabled={carregando}
      >
        {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        {carregando ? 'Buscando sua localização...' : 'Usar minha localização'}
      </Button>

      {erro && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-400">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {erro}
        </p>
      )}

      {resultado && (
        <div className="overflow-hidden rounded-lg border">
          <iframe
            title="Mapa da localização encontrada"
            className="h-44 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer"
            src={urlMapaEmbutido(resultado.lat, resultado.lng)}
          />
          <div className="space-y-1 border-t bg-card p-2.5">
            {resultado.enderecoCompleto && (
              <p className="text-xs text-muted-foreground">{resultado.enderecoCompleto}</p>
            )}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium">
                O pino está certo? Ajuste os campos abaixo se precisar.
              </p>
              <a
                href={urlMapaExterno(resultado.lat, resultado.lng)}
                target="_blank"
                rel="noreferrer noopener"
                className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Abrir mapa <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
