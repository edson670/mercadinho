import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Usuario } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@core/database/prisma.service';
import { HashingService } from '@core/security/hashing.service';
import { JwtPayload } from '../strategies/jwt.strategy';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface MfaPendingPayload {
  sub: string;
  typ: 'mfa_pending';
}

/**
 * Emite, persiste, rotaciona e revoga tokens de acesso/refresh.
 *
 * O refresh token nunca é gravado em texto puro: a tabela guarda apenas o
 * digest SHA-256. Quem obtiver leitura do banco (backup vazado, acesso de
 * DBA) não consegue reconstruir uma sessão utilizável.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly hashing: HashingService,
  ) {}

  async issuePair(user: Usuario): Promise<TokenPair> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m'),
    });

    const refreshToken = await this.jwt.signAsync(
      { ...payload, jti: randomUUID() },
      {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '7d'),
      },
    );

    await this.persistRefresh(user.id, refreshToken);
    return { accessToken, refreshToken };
  }

  /** Valida o refresh token (assinatura + registro no banco) e rotaciona. */
  async rotate(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    const registro = await this.prisma.refreshToken.findUnique({
      where: { token: this.hashing.tokenDigest(refreshToken) },
    });
    if (!registro || registro.revogado || registro.expiraEm < new Date()) {
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    }

    const user = await this.prisma.usuario.findUnique({ where: { id: payload.sub } });
    if (!user || !user.ativo) {
      throw new UnauthorizedException('Usuário inválido ou inativo.');
    }

    // Rotação atômica: só uma requisição consegue marcar revogado=true a
    // partir de false (o `where` inclui a condição, não é um update cego).
    // Sem isso, duas renovações concorrentes com o mesmo token — o caso comum
    // é o StrictMode do React disparando o boot duas vezes em dev, mas duas
    // abas também bastam — passavam ambas pelo check acima e colidiam ao
    // inserir o novo refresh token (mesmo segundo, mesmo payload → mesmo
    // digest → violação de unicidade vazando como 500/409 de banco).
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: registro.id, revogado: false },
      data: { revogado: true },
    });
    if (count === 0) {
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    }

    return this.issuePair(user);
  }

  /**
   * Token curto que identifica "senha já validada, aguardando segundo fator"
   * — nunca carrega role/email como o access token, e um `typ` próprio
   * impede que seja reutilizado como token de acesso caso vaze.
   */
  async issueMfaPendingToken(usuarioId: string): Promise<string> {
    const payload: MfaPendingPayload = { sub: usuarioId, typ: 'mfa_pending' };
    return this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: '5m',
    });
  }

  async verifyMfaPendingToken(token: string): Promise<string> {
    try {
      const payload = await this.jwt.verifyAsync<MfaPendingPayload>(token, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      });
      if (payload.typ !== 'mfa_pending') throw new Error('tipo inválido');
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Verificação expirada. Faça login novamente.');
    }
  }

  /** Revoga um refresh token específico (logout). */
  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: this.hashing.tokenDigest(refreshToken) },
      data: { revogado: true },
    });
  }

  private async persistRefresh(usuarioId: string, token: string): Promise<void> {
    const dias = this.parseDays(this.config.get('JWT_REFRESH_EXPIRES', '7d'));
    const expiraEm = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { token: this.hashing.tokenDigest(token), usuarioId, expiraEm },
    });
  }

  private parseDays(expr: string): number {
    const match = /^(\d+)d$/.exec(expr.trim());
    return match ? Number(match[1]) : 7;
  }
}
