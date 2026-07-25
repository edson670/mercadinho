import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { HashingService } from '@core/security/hashing.service';
import { AuthUser } from '@core/auth/current-user.decorator';
import { IUserRepository, USER_REPOSITORY } from '@modules/users/domain/user.repository';
import { UserResponseDto } from '@modules/users/presentation/dto/user-response.dto';
import { TokenService } from './token.service';
import { MailerService } from './mailer.service';
import {
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
} from '../presentation/dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly hashing: HashingService,
    private readonly tokens: TokenService,
    private readonly mailer: MailerService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    // Mensagem genérica para não revelar existência do e-mail.
    if (!user) throw new UnauthorizedException('Credenciais inválidas.');
    if (!user.ativo) throw new UnauthorizedException('Usuário inativo.');

    const senhaOk = await this.hashing.compare(dto.senha, user.senhaHash);
    if (!senhaOk) throw new UnauthorizedException('Credenciais inválidas.');

    await this.users.touchLastLogin(user.id);
    const pair = await this.tokens.issuePair(user);

    return { ...pair, user: UserResponseDto.fromEntity(user) };
  }

  async refresh(refreshToken: string) {
    return this.tokens.rotate(refreshToken);
  }

  async logout(refreshToken: string) {
    await this.tokens.revoke(refreshToken);
    return { message: 'Sessão encerrada.' };
  }

  me(user: AuthUser) {
    return user;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.users.findByEmail(dto.email);
    // Sempre responde OK (evita enumeração de e-mails).
    if (user && user.ativo) {
      const token = this.hashing.randomToken();
      const expiraEm = new Date(Date.now() + 60 * 60 * 1000); // 1h
      // Só o digest vai para o banco; o token em claro existe apenas no e-mail.
      await this.users.setResetToken(user.id, this.hashing.tokenDigest(token), expiraEm);
      await this.mailer.sendPasswordReset(user.email, token);
    }
    return { message: 'Se o e-mail existir, enviaremos instruções de recuperação.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.users.findByResetToken(this.hashing.tokenDigest(dto.token));
    if (!user || !user.resetTokenExpira || user.resetTokenExpira < new Date()) {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
    const senhaHash = await this.hashing.hash(dto.novaSenha);
    await this.users.updatePassword(user.id, senhaHash);
    await this.users.clearResetToken(user.id);
    // Redefinir senha encerra todas as sessões: se a troca foi motivada por
    // suspeita de invasão, o refresh token do invasor morre junto.
    await this.users.revokeSessions(user.id);
    return { message: 'Senha redefinida com sucesso.' };
  }
}
