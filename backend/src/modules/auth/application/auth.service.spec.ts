import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HashingService } from '@core/security/hashing.service';
import type { IUserRepository } from '@modules/users/domain/user.repository';
import { TokenService } from './token.service';
import { MailerService } from './mailer.service';

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
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('AuthService — bloqueio progressivo por conta', () => {
  let users: jest.Mocked<IUserRepository>;
  let hashing: { compare: jest.Mock; hash: jest.Mock; randomToken: jest.Mock; tokenDigest: jest.Mock };
  let tokens: { issuePair: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      registrarFalhaLogin: jest.fn(),
      limparFalhasLogin: jest.fn(),
      touchLastLogin: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    hashing = {
      compare: jest.fn(),
      hash: jest.fn(),
      randomToken: jest.fn(),
      tokenDigest: jest.fn((t: string) => `digest(${t})`),
    };
    tokens = { issuePair: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }) };

    service = new AuthService(
      users,
      hashing as unknown as HashingService,
      tokens as unknown as TokenService,
      {} as MailerService,
    );
  });

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

    await expect(service.login({ email: 'admin@mercado.local', senha: 'errada' })).rejects.toThrow();

    expect(users.registrarFalhaLogin).toHaveBeenCalledWith('u1', null);
  });

  it('bloqueia a partir da 5ª falha com backoff crescente', async () => {
    users.findByEmail.mockResolvedValue(makeUser({ tentativasFalhas: 4 }));
    hashing.compare.mockResolvedValue(false);

    await expect(service.login({ email: 'admin@mercado.local', senha: 'errada' })).rejects.toThrow();

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
