import type { CookieOptions, Response } from 'express';

export const REFRESH_COOKIE = 'mercado_rt';

/**
 * O refresh token vive só neste cookie: `httpOnly` o torna inacessível a
 * qualquer JavaScript da página, então um XSS não consegue roubá-lo (era o
 * cenário do achado A2 — antes ficava em localStorage junto do access token).
 *
 * `path` restrito às rotas de autenticação: não há motivo para o cookie
 * acompanhar toda requisição da API, e reduzir o alcance reduz a exposição.
 *
 * `sameSite: 'lax'` já barra envio em navegação cross-site. Frontend e API
 * ficam no mesmo site em dev (localhost:5173 → localhost:3000; a porta não
 * entra na definição de "site") e sob o mesmo domínio em produção (docs/12).
 */
export function refreshCookieOptions(opts: {
  apiPrefix: string;
  isProduction: boolean;
  maxAgeMs: number;
}): CookieOptions {
  return {
    httpOnly: true,
    // Sem HTTPS em dev o navegador descartaria um cookie `secure`.
    secure: opts.isProduction,
    sameSite: 'lax',
    path: `/${opts.apiPrefix}/auth`.replace(/\/+/g, '/'),
    maxAge: opts.maxAgeMs,
  };
}

export function clearRefreshCookie(res: Response, options: CookieOptions): void {
  // maxAge/expires não entram no clear: o par nome+path+sameSite é o que o
  // navegador usa para casar o cookie a ser removido.
  const { maxAge: _maxAge, ...rest } = options;
  res.clearCookie(REFRESH_COOKIE, rest);
}
