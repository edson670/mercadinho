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

/** A partir da 5ª falha o bloqueio entra; antes disso só conta. */
const FALHAS_ATE_BLOQUEIO = 5;
/** Backoff exponencial: 1min, 2min, 4min... limitado a 30min. */
const BLOQUEIO_BASE_MS = 60_000;
const BLOQUEIO_MAX_MS = 30 * 60_000;

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

    // Conta bloqueada responde igual a credencial errada: informar o bloqueio
    // confirmaria que o e-mail existe e ainda entregaria ao atacante o retorno
    // de que vale a pena insistir nesta conta.
    if (user.bloqueadoAte && user.bloqueadoAte > new Date()) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const senhaOk = await this.hashing.compare(dto.senha, user.senhaHash);
    if (!senhaOk) {
      await this.registrarFalha(user.tentativasFalhas, user.id);
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    await this.users.limparFalhasLogin(user.id);
    await this.users.touchLastLogin(user.id);
    const pair = await this.tokens.issuePair(user);

    return { ...pair, user: UserResponseDto.fromEntity(user) };
  }

  /**
   * Rate limit por IP não cobre ataque distribuído contra uma conta específica.
   * O backoff é exponencial e curto para não virar negação de serviço: quem
   * conhece o e-mail de alguém consegue atrapalhar, mas só por minutos.
   */
  private async registrarFalha(falhasAnteriores: number, usuarioId: string) {
    const falhas = falhasAnteriores + 1;
    if (falhas < FALHAS_ATE_BLOQUEIO) {
      await this.users.registrarFalhaLogin(usuarioId, null);
      return;
    }
    const espera = Math.min(
      BLOQUEIO_BASE_MS * 2 ** (falhas - FALHAS_ATE_BLOQUEIO),
      BLOQUEIO_MAX_MS,
    );
    await this.users.registrarFalhaLogin(usuarioId, new Date(Date.now() + espera));
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
    // Quem redefiniu a senha com sucesso não deve continuar bloqueado pelas
    // tentativas anteriores — inclusive porque redefinir é a saída legítima
    // de quem esqueceu a senha e errou várias vezes.
    await this.users.limparFalhasLogin(user.id);
    // Redefinir senha encerra todas as sessões: se a troca foi motivada por
    // suspeita de invasão, o refresh token do invasor morre junto.
    await this.users.revokeSessions(user.id);
    return { message: 'Senha redefinida com sucesso.' };
  }
}
