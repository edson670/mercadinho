import { ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { EstoqueInsuficienteError, NotFoundError } from './domain.errors';

function makeHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { method: 'GET', url: '/test' };
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  // Erros 5xx são logados propositalmente pelo filtro; silenciamos para não poluir a saída do teste.
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('mapeia NotFoundError (domínio) para 404', () => {
    const { host, status, json } = makeHost();

    filter.catch(new NotFoundError('Produto', '123'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, error: 'NotFound' }),
    );
  });

  it('mapeia EstoqueInsuficienteError para 409', () => {
    const { host, status, json } = makeHost();

    filter.catch(new EstoqueInsuficienteError('Arroz 5kg'), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, error: 'BusinessRule' }),
    );
  });

  it('mapeia exceções HTTP nativas do Nest preservando o status', () => {
    const { host, status, json } = makeHost();

    filter.catch(new NotFoundException('Rota não encontrada'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Rota não encontrada' }),
    );
  });

  it('mapeia erro de unicidade do Prisma (P2002) para 409', () => {
    const { host, status, json } = makeHost();
    const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.2.0',
      meta: { target: ['email'] },
    });

    filter.catch(prismaError, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, error: 'Conflict' }),
    );
  });

  it('mapeia erros desconhecidos para 500', () => {
    const { host, status, json } = makeHost();

    filter.catch(new Error('Falha inesperada'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, message: 'Falha inesperada' }),
    );
  });
});
