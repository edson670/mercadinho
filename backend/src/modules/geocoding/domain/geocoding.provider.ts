export const GEOCODING_PROVIDER = Symbol('GEOCODING_PROVIDER');

/** Endereço já normalizado nos campos que o checkout do catálogo usa. */
export interface EnderecoGeocodificado {
  logradouro: string | null;
  numeroEndereco: string | null;
  bairro: string | null;
  cidade: string | null;
  /** Linha completa devolvida pelo serviço, para o cliente conferir. */
  enderecoCompleto: string | null;
}

/**
 * Porta de geocodificação reversa. Existe para o provedor ser trocável: hoje
 * Nominatim (gratuito), amanhã Google/Mapbox, sem mexer no catálogo.
 */
export interface IGeocodingProvider {
  reverse(lat: number, lng: number): Promise<EnderecoGeocodificado | null>;
}
