import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { PrismaService } from '@core/database/prisma.service';
import { AuditInterceptor } from './audit.interceptor';

function makeContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function makeHandler(response: unknown): CallHandler {
  return { handle: () => of(response) } as CallHandler;
}

describe('AuditInterceptor', () => {
  it('remove campos sensíveis em objetos aninhados e arrays', () => {
    const interceptor = new AuditInterceptor({} as PrismaService);

    const input = {
      email: 'a@b.com',
      senha: 'segredo123',
      user: { accessToken: 'xyz', nome: 'Joao' },
      items: [{ token: 'abc', ok: true }],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitized = (interceptor as any).sanitize(input);

    expect(sanitized).toEqual({
      email: 'a@b.com',
      user: { nome: 'Joao' },
      items: [{ ok: true }],
    });
  });

  it('não audita requisições GET', (done) => {
    const create = jest.fn();
    const prisma = { auditoria: { create } } as unknown as PrismaService;
    const interceptor = new AuditInterceptor(prisma);

    const context = makeContext({ method: 'GET', path: '/products' });
    const handler = makeHandler({ id: '1' });

    interceptor.intercept(context, handler).subscribe(() => {
      expect(create).not.toHaveBeenCalled();
      done();
    });
  });

  it('audita requisições mutáveis com dados sanitizados', (done) => {
    const create = jest.fn().mockResolvedValue(undefined);
    const prisma = { auditoria: { create } } as unknown as PrismaService;
    const interceptor = new AuditInterceptor(prisma);

    const request = {
      method: 'POST',
      route: { path: '/users' },
      path: '/users',
      params: {},
      headers: {},
      ip: '127.0.0.1',
      body: { nome: 'Maria', senha: 'segredo' },
      user: { id: 'admin-1' },
    };
    const context = makeContext(request);
    const handler = makeHandler({ id: 'novo-usuario', nome: 'Maria' });

    interceptor.intercept(context, handler).subscribe(() => {
      setImmediate(() => {
        expect(create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            usuarioId: 'admin-1',
            acao: 'POST /users',
            entidade: 'users',
            entidadeId: 'novo-usuario',
            dadosAntes: { nome: 'Maria' },
            dadosDepois: { id: 'novo-usuario', nome: 'Maria' },
            ip: '127.0.0.1',
          }),
        });
        done();
      });
    });
  });
});
