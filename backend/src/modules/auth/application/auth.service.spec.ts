import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HashingService } from '@core/security/hashing.service';
import type { IUserRepository } from '@modules/users/domain/user.repository';
import { TokenService } from './token.service';
import { MailerService } from './mailer.service';
import { MfaService } from './mfa.service';

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'u1',
    nome: 'Admin',
    email: 'admin@mercado.local',
    senhaHash: 'hash',
    role: 'ADMINISTRADOR',
    ativo: true,
    ultimoLogin: null,
    resetToken: null,
    resetTokenExpira: null,
    tentativasFalhas: 0,
    bloqueadoAte: null,
    mfaEnabled: false,
    mfaSecretCifrado: null,
    mfaRecoveryCodesJson: null,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('AuthService', () => {
  let users: jest.Mocked<IUserRepository>;
  let hashing: { compare: jest.Mock; hash: jest.Mock; randomToken: jest.Mock; tokenDigest: jest.Mock };
  let tokens: {
    issuePair: jest.Mock;
    issueMfaPendingToken: jest.Mock;
    verifyMfaPendingToken: jest.Mock;
  };
  let mfa: {
    gerarSegredo: jest.Mock;
    gerarQrCodeDataUrl: jest.Mock;
    verificarCodigo: jest.Mock;
    gerarCodigosRecuperacao: jest.Mock;
    cifrar: jest.Mock;
  };
  let service: AuthService;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      registrarFalhaLogin: jest.fn(),
      limparFalhasLogin: jest.fn(),
      touchLastLogin: jest.fn(),
      setMfaPendingSecret: jest.fn(),
      enableMfa: jest.fn(),
      disableMfa: jest.fn(),
      consumeRecoveryCode: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    hashing = {
      compare: jest.fn(),
      hash: jest.fn(),
      randomToken: jest.fn(),
      tokenDigest: jest.fn((t: string) => `digest(${t})`),
    };
    tokens = {
      issuePair: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }),
      issueMfaPendingToken: jest.fn().mockResolvedValue('mfa-pending-token'),
      verifyMfaPendingToken: jest.fn().mockResolvedValue('u1'),
    };
    mfa = {
      gerarSegredo: jest.fn().mockReturnValue({ secret: 'SECRET', otpauthUrl: 'otpauth://...' }),
      gerarQrCodeDataUrl: jest.fn().mockResolvedValue('data:image/png;base64,...'),
      verificarCodigo: jest.fn(),
      gerarCodigosRecuperacao: jest.fn().mockReturnValue(['aaaa', 'bbbb']),
      cifrar: jest.fn((v: string) => `cifrado(${v})`),
    };

    service = new AuthService(
      users,
      hashing as unknown as HashingService,
      tokens as unknown as TokenService,
      {} as MailerService,
      mfa as unknown as MfaService,
    );
  });

  describe('bloqueio progressivo por conta', () => {
    it('rejeita conta bloqueada com a mesma mensagem genérica, sem checar a senha', async () => {
      users.findByEmail.mockResolvedValue(
        makeUser({ bloqueadoAte: new Date(Date.now() + 60_000) }),
      );

      await expect(service.login({ email: 'admin@mercado.local', senha: 'x' })).rejects.toThrow(
        new UnauthorizedException('Credenciais inválidas.'),
      );
      expect(hashing.compare).not.toHaveBeenCalled();
    });

    it('conta a falha mas não bloqueia antes da 5ª tentativa', async () => {
      users.findByEmail.mockResolvedValue(makeUser({ tentativasFalhas: 2 }));
      hashing.compare.mockResolvedValue(false);

      await expect(
        service.login({ email: 'admin@mercado.local', senha: 'errada' }),
      ).rejects.toThrow();

      expect(users.registrarFalhaLogin).toHaveBeenCalledWith('u1', null);
    });

    it('bloqueia a partir da 5ª falha com backoff crescente', async () => {
      users.findByEmail.mockResolvedValue(makeUser({ tentativasFalhas: 4 }));
      hashing.compare.mockResolvedValue(false);

      await expect(
        service.login({ email: 'admin@mercado.local', senha: 'errada' }),
      ).rejects.toThrow();

      const [, bloqueadoAte] = users.registrarFalhaLogin.mock.calls[0];
      expect(bloqueadoAte).toBeInstanceOf(Date);
      expect((bloqueadoAte as Date).getTime()).toBeGreaterThan(Date.now());
    });

    it('login correto limpa o contador de falhas', async () => {
      users.findByEmail.mockResolvedValue(makeUser({ tentativasFalhas: 3 }));
      hashing.compare.mockResolvedValue(true);

      await service.login({ email: 'admin@mercado.local', senha: 'correta' });

      expect(users.limparFalhasLogin).toHaveBeenCalledWith('u1');
    });
  });

  describe('MFA', () => {
    it('login com MFA ativo não emite tokens — devolve mfaToken', async () => {
      users.findByEmail.mockResolvedValue(makeUser({ mfaEnabled: true }));
      hashing.compare.mockResolvedValue(true);

      const result = await service.login({ email: 'admin@mercado.local', senha: 'correta' });

      expect(result).toEqual({ mfaRequired: true, mfaToken: 'mfa-pending-token' });
      expect(tokens.issuePair).not.toHaveBeenCalled();
      expect(users.touchLastLogin).not.toHaveBeenCalled();
    });

    it('login sem MFA recomenda ativação para ADMINISTRADOR/GERENTE', async () => {
      users.findByEmail.mockResolvedValue(makeUser({ role: 'ADMINISTRADOR', mfaEnabled: false }));
      hashing.compare.mockResolvedValue(true);

      const result = await service.login({ email: 'admin@mercado.local', senha: 'correta' });

      expect(result).toMatchObject({ mfaRequired: false, mfaSetupRecommended: true });
    });

    it('login sem MFA não recomenda ativação para CAIXA', async () => {
      users.findByEmail.mockResolvedValue(makeUser({ role: 'CAIXA', mfaEnabled: false }));
      hashing.compare.mockResolvedValue(true);

      const result = await service.login({ email: 'admin@mercado.local', senha: 'correta' });

      expect(result).toMatchObject({ mfaSetupRecommended: false });
    });

    it('mfaVerify aceita o código correto e emite os tokens', async () => {
      users.findById.mockResolvedValue(
        makeUser({ mfaEnabled: true, mfaSecretCifrado: 'cifrado(SECRET)' }),
      );
      mfa.verificarCodigo.mockReturnValue(true);

      const result = await service.mfaVerify('mfa-pending-token', '123456');

      expect(result).toMatchObject({ accessToken: 'a', refreshToken: 'r' });
      expect(users.touchLastLogin).toHaveBeenCalledWith('u1');
    });

    it('mfaVerify aceita um código de recuperação válido e o consome (single-use)', async () => {
      users.findById.mockResolvedValue(
        makeUser({
          mfaEnabled: true,
          mfaSecretCifrado: 'cifrado(SECRET)',
          mfaRecoveryCodesJson: JSON.stringify(['digest(recovery-1)', 'digest(recovery-2)']),
        }),
      );
      mfa.verificarCodigo.mockReturnValue(false);

      await service.mfaVerify('mfa-pending-token', 'recovery-1');

      expect(users.consumeRecoveryCode).toHaveBeenCalledWith('u1', ['digest(recovery-2)']);
    });

    it('mfaVerify rejeita código inválido e conta como falha de login', async () => {
      users.findById.mockResolvedValue(
        makeUser({ mfaEnabled: true, mfaSecretCifrado: 'cifrado(SECRET)', tentativasFalhas: 0 }),
      );
      mfa.verificarCodigo.mockReturnValue(false);

      await expect(service.mfaVerify('mfa-pending-token', '000000')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(users.registrarFalhaLogin).toHaveBeenCalledWith('u1', null);
    });

    it('mfaSetup gera segredo, cifra e devolve QR code + chave manual', async () => {
      users.findById.mockResolvedValue(makeUser({ mfaEnabled: false }));

      const result = await service.mfaSetup('u1');

      expect(users.setMfaPendingSecret).toHaveBeenCalledWith('u1', 'cifrado(SECRET)');
      expect(result).toEqual({
        qrCodeDataUrl: 'data:image/png;base64,...',
        manualEntryKey: 'SECRET',
      });
    });

    it('mfaSetup rejeita se o MFA já estiver ativo', async () => {
      users.findById.mockResolvedValue(makeUser({ mfaEnabled: true }));

      await expect(service.mfaSetup('u1')).rejects.toThrow(BadRequestException);
    });

    it('mfaEnable confirma o código pendente e devolve os códigos de recuperação em claro', async () => {
      users.findById.mockResolvedValue(
        makeUser({ mfaEnabled: false, mfaSecretCifrado: 'cifrado(SECRET)' }),
      );
      mfa.verificarCodigo.mockReturnValue(true);

      const result = await service.mfaEnable('u1', '123456');

      expect(users.enableMfa).toHaveBeenCalledWith('u1', ['digest(aaaa)', 'digest(bbbb)']);
      expect(result.recoveryCodes).toEqual(['aaaa', 'bbbb']);
    });

    it('mfaEnable rejeita código incorreto', async () => {
      users.findById.mockResolvedValue(
        makeUser({ mfaEnabled: false, mfaSecretCifrado: 'cifrado(SECRET)' }),
      );
      mfa.verificarCodigo.mockReturnValue(false);

      await expect(service.mfaEnable('u1', '000000')).rejects.toThrow(UnauthorizedException);
      expect(users.enableMfa).not.toHaveBeenCalled();
    });

    it('mfaDisable exige senha e código corretos', async () => {
      users.findById.mockResolvedValue(
        makeUser({ mfaEnabled: true, mfaSecretCifrado: 'cifrado(SECRET)' }),
      );
      hashing.compare.mockResolvedValue(true);
      mfa.verificarCodigo.mockReturnValue(true);

      await service.mfaDisable('u1', { senha: 'correta', codigo: '123456' });

      expect(users.disableMfa).toHaveBeenCalledWith('u1');
    });

    it('mfaDisable rejeita senha incorreta sem verificar o código', async () => {
      users.findById.mockResolvedValue(
        makeUser({ mfaEnabled: true, mfaSecretCifrado: 'cifrado(SECRET)' }),
      );
      hashing.compare.mockResolvedValue(false);

      await expect(
        service.mfaDisable('u1', { senha: 'errada', codigo: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(users.disableMfa).not.toHaveBeenCalled();
    });
  });
});
