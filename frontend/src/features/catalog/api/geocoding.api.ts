import { apiClient } from '@/lib/api-client';

export interface EnderecoPorLocalizacao {
  logradouro: string | null;
  numeroEndereco: string | null;
  bairro: string | null;
  cidade: string | null;
  enderecoCompleto: string | null;
  encontrado: boolean;
  lat: number;
  lng: number;
}

export async function reverseGeocode(lat: number, lng: number): Promise<EnderecoPorLocalizacao> {
  const { data } = await apiClient.get('/public/geocode/reverse', { params: { lat, lng } });
  return data;
}

export type MotivoFalhaLocalizacao =
  'sem-suporte' | 'inseguro' | 'negado' | 'indisponivel' | 'tempo-esgotado';

export const MENSAGEM_FALHA: Record<MotivoFalhaLocalizacao, string> = {
  'sem-suporte': 'Seu navegador não oferece localização. Digite o endereço abaixo.',
  // O erro mais confuso de todos: em HTTP a API simplesmente não existe, e
  // sem esta mensagem o cliente acha que o botão está quebrado.
  inseguro: 'A localização só funciona em conexão segura (https). Digite o endereço abaixo.',
  negado: 'Permissão de localização negada. Libere no navegador ou digite o endereço abaixo.',
  indisponivel: 'Não foi possível obter sua localização agora. Digite o endereço abaixo.',
  'tempo-esgotado': 'A localização demorou demais. Tente de novo ou digite o endereço abaixo.',
};

/** Envolve a API do navegador em Promise e traduz os códigos de erro. */
export function obterCoordenadas(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    // `navigator.geolocation` só existe em contexto seguro (https ou
    // localhost). Distinguir isso de "sem suporte" muda o que o cliente faz.
    if (!('geolocation' in navigator)) {
      reject(window.isSecureContext ? 'sem-suporte' : 'inseguro');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      (erro) => {
        if (erro.code === erro.PERMISSION_DENIED) reject('negado');
        else if (erro.code === erro.TIMEOUT) reject('tempo-esgotado');
        else reject('indisponivel');
      },
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        // Uma leitura de até 1 min atrás serve e evita acender o GPS de novo.
        maximumAge: 60_000,
      },
    );
  });
}

/** Recorte do mapa do OpenStreetMap centrado no ponto, com o marcador. */
export function urlMapaEmbutido(lat: number, lng: number): string {
  const d = 0.002; // ~200 m de cada lado
  const bbox = [lng - d, lat - d, lng + d, lat + d].join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}

/** Link para abrir o ponto no mapa completo, fora do catálogo. */
export function urlMapaExterno(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
}
