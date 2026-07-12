import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Usuario } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { JwtPayload } from '../strategies/jwt.strategy';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Emite, persiste, rotaciona e revoga tokens de acesso/refresh. */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async issuePair(user: Usuario): Promise<TokenPair> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m'),
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '7d'),
    });

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

    const registro = await this.prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!registro || registro.revogado || registro.expiraEm < new Date()) {
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    }

    const user = await this.prisma.usuario.findUnique({ where: { id: payload.sub } });
    if (!user || !user.ativo) {
      throw new UnauthorizedException('Usuário inválido ou inativo.');
    }

    // Rotação: revoga o token usado e emite um novo par.
    await this.prisma.refreshToken.update({
      where: { id: registro.id },
      data: { revogado: true },
    });

    return this.issuePair(user);
  }

  /** Revoga um refresh token específico (logout). */
  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revogado: true },
    });
  }

  private async persistRefresh(usuarioId: string, token: string): Promise<void> {
    const dias = this.parseDays(this.config.get('JWT_REFRESH_EXPIRES', '7d'));
    const expiraEm = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({ data: { token, usuarioId, expiraEm } });
  }

  private parseDays(expr: string): number {
    const match = /^(\d+)d$/.exec(expr.trim());
    return match ? Number(match[1]) : 7;
  }
}
