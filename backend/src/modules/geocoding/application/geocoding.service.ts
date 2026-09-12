import { Inject, Injectable } from '@nestjs/common';
import { ValidationError } from '@core/errors/domain.errors';
import {
  EnderecoGeocodificado,
  GEOCODING_PROVIDER,
  IGeocodingProvider,
} from '../domain/geocoding.provider';

/** ~11 m de precisão: o suficiente para o endereço, e agrupa quem está junto. */
const CASAS_DECIMAIS = 4;
const CACHE_TTL_MS = 10 * 60_000;
const CACHE_MAX = 500;

interface Entrada {
  valor: EnderecoGeocodificado | null;
  expiraEm: number;
}

@Injectable()
export class GeocodingService {
  private readonly cache = new Map<string, Entrada>();

  constructor(@Inject(GEOCODING_PROVIDER) private readonly provider: IGeocodingProvider) {}

  async reverse(lat: number, lng: number) {
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new ValidationError('Latitude inválida.');
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new ValidationError('Longitude inválida.');
    }

    // Arredondar antes de consultar faz o cache valer: dois moradores do
    // mesmo prédio produzem coordenadas ligeiramente diferentes e uma única
    // chamada ao provedor atende os dois.
    const latArr = Number(lat.toFixed(CASAS_DECIMAIS));
    const lngArr = Number(lng.toFixed(CASAS_DECIMAIS));
    const chave = `${latArr},${lngArr}`;

    const cacheado = this.cache.get(chave);
    if (cacheado && cacheado.expiraEm > Date.now()) {
      return { ...this.vazioSeNulo(cacheado.valor), lat: latArr, lng: lngArr };
    }

    const endereco = await this.provider.reverse(latArr, lngArr);
    this.guardar(chave, endereco);

    return { ...this.vazioSeNulo(endereco), lat: latArr, lng: lngArr };
  }

  /**
   * Provedor fora do ar não pode virar erro na tela: o cliente ainda pode
   * digitar o endereço à mão. Devolve campos vazios e o catálogo avisa.
   */
  private vazioSeNulo(e: EnderecoGeocodificado | null): EnderecoGeocodificado & {
    encontrado: boolean;
  } {
    return {
      logradouro: e?.logradouro ?? null,
      numeroEndereco: e?.numeroEndereco ?? null,
      bairro: e?.bairro ?? null,
      cidade: e?.cidade ?? null,
      enderecoCompleto: e?.enderecoCompleto ?? null,
      encontrado: Boolean(e?.logradouro || e?.bairro || e?.cidade),
    };
  }

  private guardar(chave: string, valor: EnderecoGeocodificado | null) {
    // Descarte simples do mais antigo: o Map preserva ordem de inserção e o
    // volume aqui é pequeno — não vale uma LRU de verdade.
    if (this.cache.size >= CACHE_MAX) {
      const maisAntiga = this.cache.keys().next().value;
      if (maisAntiga) this.cache.delete(maisAntiga);
    }
    this.cache.set(chave, { valor, expiraEm: Date.now() + CACHE_TTL_MS });
  }
}
