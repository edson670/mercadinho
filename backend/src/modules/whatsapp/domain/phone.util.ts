const BR_COUNTRY_CODE = '55';

/** Mantém apenas dígitos. */
export function onlyDigits(valor: string): string {
  return (valor ?? '').replace(/\D/g, '');
}

/**
 * Converte o telefone informado pelo cliente (DDD + número, como guardamos
 * no cadastro) para o formato aceito pelo WhatsApp: 55 + DDD + número.
 */
export function toWhatsAppNumber(telefone: string): string {
  const digitos = onlyDigits(telefone);
  if (digitos.startsWith(BR_COUNTRY_CODE) && digitos.length >= 12) return digitos;
  return `${BR_COUNTRY_CODE}${digitos}`;
}

/**
 * Inverso: extrai o telefone nacional (DDD + número) de um número/JID do
 * WhatsApp — é assim que ele fica salvo em Cliente.telefone e Pedido.telefone.
 */
export function toNationalDigits(numeroOuJid: string): string {
  const digitos = onlyDigits((numeroOuJid ?? '').split('@')[0]);
  if (digitos.startsWith(BR_COUNTRY_CODE) && digitos.length > 11) {
    return digitos.slice(BR_COUNTRY_CODE.length);
  }
  return digitos;
}

/** Mensagens de grupo (`@g.us`) não fazem parte do fluxo de pedidos. */
export function isGroupJid(jid: string): boolean {
  return (jid ?? '').includes('@g.us');
}
