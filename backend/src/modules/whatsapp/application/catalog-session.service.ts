import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

interface CatalogSessionPayload {
  /** Marca o tipo do token: impede que seja usado como token de acesso da API. */
  typ: 'catalog';
  telefone: string;
  nome?: string;
}

/**
 * Token curto e opaco que carrega o telefone do cliente até o catálogo,
 * para pré-preencher o checkout. Evita expor o telefone na URL (PII em
 * query string acabaria em logs/histórico do navegador).
 */
@Injectable()
export class CatalogSessionService {
  private readonly secret: string;
  private readonly catalogUrl: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.secret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.catalogUrl = (this.config.get<string>('CATALOG_PUBLIC_URL') ?? 'http://localhost:5173/catalogo')
      .replace(/\/+$/, '');
  }

  async criarLink(telefone: string, nome?: string): Promise<string> {
    const payload: CatalogSessionPayload = { typ: 'catalog', telefone, nome };
    const token = await this.jwt.signAsync(payload, {
      secret: this.secret,
      expiresIn: '2h',
    });
    return `${this.catalogUrl}?s=${encodeURIComponent(token)}`;
  }

  async resolver(token: string): Promise<{ telefone: string; nome?: string }> {
    try {
      const payload = await this.jwt.verifyAsync<CatalogSessionPayload>(token, {
        secret: this.secret,
      });
      if (payload.typ !== 'catalog') throw new Error('tipo inválido');
      return { telefone: payload.telefone, nome: payload.nome };
    } catch {
      throw new UnauthorizedException('Link expirado. Envie uma mensagem para receber um novo.');
    }
  }
}
