import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { HashingService } from '@core/security/hashing.service';
import { AuthUser } from '@core/auth/current-user.decorator';
import { IUserRepository, USER_REPOSITORY } from '@modules/users/domain/user.repository';
import { UserResponseDto } from '@modules/users/presentation/dto/user-response.dto';
import { TokenService } from './token.service';
import { MailerService } from './mailer.service';
import { MfaService } from './mfa.service';
import {
  ForgotPasswordDto,
  LoginDto,
  MfaDisableDto,
  ResetPasswordDto,
} from '../presentation/dto/auth.dto';

/** A partir da 5ª falha o bloqueio entra; antes disso só conta. */
const FALHAS_ATE_BLOQUEIO = 5;
/** Backoff exponencial: 1min, 2min, 4min... limitado a 30min. */
const BLOQUEIO_BASE_MS = 60_000;
const BLOQUEIO_MAX_MS = 30 * 60_000;

/** Perfis para os quais o frontend deve insistir na ativação do MFA (B4). */
const ROLES_MFA_RECOMENDADO: Role[] = [Role.ADMINISTRADOR, Role.GERENTE];

/**
 * Hash argon2 de uma senha aleatória descartada, usado só para gastar o mesmo
 * tempo de verificação quando o e-mail não existe (ver login). Não destranca
 * nada — ninguém conhece o texto que o gerou — e o caminho que o usa termina
 * sempre em 401.
 */
const HASH_FALSO =
  '$argon2id$v=19$m=65536,t=3,p=4$x4OdUWEObkJQuA3skdXwBQ$q18YgRLomELRp1qBHanXfWqOr44AWOv7OuZt+EmmAII';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly hashing: HashingService,
    private readonly tokens: TokenService,
    private readonly mailer: MailerService,
    private readonly mfa: MfaService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);

    if (!user) {
      // Compara contra um hash descartável antes de recusar. Sem isto, o
      // e-mail inexistente respondia na hora e o existente só depois do
      // bcrypt: a diferença de tempo, sozinha, já dizia quais e-mails têm
      // conta no sistema.
      await this.hashing.compare(dto.senha, HASH_FALSO);
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    // Conta inativa responde igual a credencial errada: dizer "usuário
    // inativo" confirmava que aquele e-mail existe — a mesma informação que
    // as outras respostas desta função evitam entregar.
    if (!user.ativo) throw new UnauthorizedException('Credenciais inválidas.');

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

    // Senha correta, mas com MFA ativo o login só termina depois do segundo
    // fator — não emite tokens nem marca último login ainda.
    if (user.mfaEnabled) {
      const mfaToken = await this.tokens.issueMfaPendingToken(user.id);
      return { mfaRequired: true as const, mfaToken };
    }

    await this.users.touchLastLogin(user.id);
    const pair = await this.tokens.issuePair(user);

    return {
      ...pair,
      mfaRequired: false as const,
      mfaSetupRecommended: ROLES_MFA_RECOMENDADO.includes(user.role) && !user.mfaEnabled,
      user: UserResponseDto.fromEntity(user),
    };
  }

  /** Segundo passo do login quando a conta tem MFA ativo. */
  async mfaVerify(mfaToken: string, codigo: string) {
    const userId = await this.tokens.verifyMfaPendingToken(mfaToken);
    const user = await this.users.findById(userId);
    if (!user || !user.ativo || !user.mfaEnabled || !user.mfaSecretCifrado) {
      throw new UnauthorizedException('Sessão de verificação inválida.');
    }

    const valido = await this.validarSegundoFator(user, codigo);
    if (!valido) {
      // Mesmo contador de força bruta do login — evita que o segundo fator
      // vire uma porta lateral sem o mesmo freio contra tentativa e erro.
      await this.registrarFalha(user.tentativasFalhas, user.id);
      throw new UnauthorizedException('Código inválido.');
    }

    await this.users.limparFalhasLogin(user.id);
    await this.users.touchLastLogin(user.id);
    const pair = await this.tokens.issuePair(user);

    return { ...pair, user: UserResponseDto.fromEntity(user) };
  }

  async mfaSetup(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    if (user.mfaEnabled) {
      throw new BadRequestException('MFA já está ativo. Desative antes de reconfigurar.');
    }

    const { secret, otpauthUrl } = this.mfa.gerarSegredo(user.email);
    // Fica "pendente" até a confirmação em mfaEnable — chamar /setup de novo
    // simplesmente substitui o segredo pendente anterior.
    await this.users.setMfaPendingSecret(userId, this.mfa.cifrar(secret));

    return {
      qrCodeDataUrl: await this.mfa.gerarQrCodeDataUrl(otpauthUrl),
      manualEntryKey: secret,
    };
  }

  async mfaEnable(userId: string, codigo: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    if (user.mfaEnabled) throw new BadRequestException('MFA já está ativo.');
    if (!user.mfaSecretCifrado) {
      throw new BadRequestException('Chame /auth/mfa/setup antes de ativar.');
    }

    if (!this.mfa.verificarCodigo(user.mfaSecretCifrado, codigo)) {
      throw new UnauthorizedException('Código inválido.');
    }

    const recoveryCodes = this.mfa.gerarCodigosRecuperacao();
    const hashes = recoveryCodes.map((c) => this.hashing.tokenDigest(c));
    await this.users.enableMfa(userId, hashes);

    // Só existem em claro nesta resposta — nunca mais são recuperáveis.
    return { message: 'MFA ativado.', recoveryCodes };
  }

  async mfaDisable(userId: string, dto: MfaDisableDto) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    if (!user.mfaEnabled) throw new BadRequestException('MFA não está ativo.');

    // Exige senha + segundo fator: um access token roubado sozinho não basta
    // para desligar a proteção que o torna menos perigoso.
    const senhaOk = await this.hashing.compare(dto.senha, user.senhaHash);
    if (!senhaOk) throw new UnauthorizedException('Senha incorreta.');

    const valido = await this.validarSegundoFator(user, dto.codigo);
    if (!valido) throw new UnauthorizedException('Código inválido.');

    await this.users.disableMfa(userId);
    return { message: 'MFA desativado.' };
  }

  /** TOTP primeiro; se não bater, tenta como código de recuperação (single-use). */
  private async validarSegundoFator(
    user: { id: string; mfaSecretCifrado: string | null; mfaRecoveryCodesJson: string | null },
    codigo: string,
  ): Promise<boolean> {
    if (user.mfaSecretCifrado && this.mfa.verificarCodigo(user.mfaSecretCifrado, codigo)) {
      return true;
    }

    const hashes: string[] = user.mfaRecoveryCodesJson
      ? JSON.parse(user.mfaRecoveryCodesJson)
      : [];
    const digest = this.hashing.tokenDigest(codigo);
    const index = hashes.indexOf(digest);
    if (index === -1) return false;

    hashes.splice(index, 1);
    await this.users.consumeRecoveryCode(user.id, hashes);
    return true;
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
