import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '@core/auth/current-user.decorator';
import { IUserRepository, USER_REPOSITORY } from '@modules/users/domain/user.repository';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /** Retorno é injetado em request.user (AuthUser). */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    // Outros tokens assinados com o mesmo segredo (ex.: sessão do catálogo)
    // não têm `sub` — recusa antes de consultar o banco, evitando um 500.
    if (!payload?.sub || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Token inválido para esta operação.');
    }

    const user = await this.users.findById(payload.sub);
    if (!user || !user.ativo) {
      throw new UnauthorizedException('Sessão inválida ou usuário inativo.');
    }
    return { id: user.id, email: user.email, nome: user.nome, role: user.role };
  }
}
