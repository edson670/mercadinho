import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnderecoGeocodificado, IGeocodingProvider } from '../domain/geocoding.provider';

/** A política do Nominatim permite no máximo 1 requisição por segundo. */
const INTERVALO_MINIMO_MS = 1100;
const TIMEOUT_MS = 8000;

/** Resposta do Nominatim (só os campos que consumimos). */
interface RespostaNominatim {
  display_name?: string;
  address?: Record<string, string | undefined>;
}

/**
 * Geocodificação reversa via Nominatim (OpenStreetMap) — gratuito e sem
 * chave, que é o requisito aqui.
 *
 * A chamada sai do servidor, não do navegador, por três motivos: o navegador
 * não pode definir o User-Agent que a política exige, o Nominatim não serve
 * CORS para uso intensivo, e centralizar permite respeitar o limite de 1
 * req/s de toda a loja — no cliente, cada aparelho contaria por si e a loja
 * inteira seria bloqueada pelo IP de saída.
 */
@Injectable()
export class NominatimProvider implements IGeocodingProvider {
  private readonly logger = new Logger(NominatimProvider.name);
  private readonly baseUrl: string;
  private readonly userAgent: string;
  /** Fila serializada: garante o espaçamento mínimo entre chamadas. */
  private ultimaChamada = 0;
  private cadeia: Promise<unknown> = Promise.resolve();

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (
      this.config.get<string>('NOMINATIM_URL') ?? 'https://nominatim.openstreetmap.org'
    ).replace(/\/+$/, '');
    this.userAgent = this.config.get<string>('GEOCODING_USER_AGENT') ?? 'SistemaMercadinho/1.0';
  }

  async reverse(lat: number, lng: number): Promise<EnderecoGeocodificado | null> {
    return this.enfileirar(async () => {
      const url = new URL(`${this.baseUrl}/reverse`);
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lng));
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('addressdetails', '1');
      // zoom 18 = nível de rua/edificação; acima disso volta só o bairro.
      url.searchParams.set('zoom', '18');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const resposta = await fetch(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept-Language': 'pt-BR,pt',
            Accept: 'application/json',
          },
          signal: controller.signal,
        });

        if (!resposta.ok) {
          this.logger.warn(`Nominatim respondeu ${resposta.status} para ${lat},${lng}`);
          return null;
        }

        const corpo = (await resposta.json()) as RespostaNominatim;
        return this.normalizar(corpo);
      } catch (err) {
        const motivo = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Falha na geocodificação de ${lat},${lng}: ${motivo}`);
        return null;
      } finally {
        clearTimeout(timer);
      }
    });
  }

  /**
   * O OSM espalha o nome da cidade por vários campos conforme o município
   * (city, town, village...), e o bairro entre suburb/neighbourhood. Pegar
   * só `city` deixava a cidade vazia no interior.
   */
  private normalizar(corpo: RespostaNominatim): EnderecoGeocodificado | null {
    const a = corpo.address;
    if (!a) return null;

    const primeiro = (...chaves: string[]) =>
      chaves.map((c) => a[c]?.trim()).find((v) => Boolean(v)) ?? null;

    return {
      logradouro: primeiro('road', 'pedestrian', 'footway', 'residential'),
      numeroEndereco: primeiro('house_number'),
      bairro: primeiro('suburb', 'neighbourhood', 'city_district', 'quarter'),
      cidade: primeiro('city', 'town', 'village', 'municipality'),
      enderecoCompleto: corpo.display_name?.trim() ?? null,
    };
  }

  /**
   * Serializa as chamadas e espaça cada uma em pelo menos INTERVALO_MINIMO_MS.
   * Dois clientes tocando "usar minha localização" no mesmo segundo geravam
   * duas requisições simultâneas — exatamente o que a política proíbe.
   */
  private enfileirar<T>(tarefa: () => Promise<T>): Promise<T> {
    const resultado = this.cadeia.then(async () => {
      const espera = this.ultimaChamada + INTERVALO_MINIMO_MS - Date.now();
      if (espera > 0) await new Promise((r) => setTimeout(r, espera));
      this.ultimaChamada = Date.now();
      return tarefa();
    });
    // A cadeia não pode quebrar quando uma tarefa falha, senão a fila trava.
    this.cadeia = resultado.catch(() => undefined);
    return resultado;
  }
}
