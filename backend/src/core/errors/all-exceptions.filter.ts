import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import {
  BusinessRuleError,
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from './domain.errors';

/**
 * Filtro global: converte exceções de domínio, do Prisma e HTTP
 * em uma resposta de erro padronizada.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Erro interno do servidor';
    let error = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        message = (r.message as string) ?? exception.message;
        error = (r.error as string) ?? exception.name;
      } else {
        message = res as string;
        error = exception.name;
      }
    } else if (exception instanceof DomainError) {
      ({ status, error } = this.mapDomainError(exception));
      message = exception.message;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      ({ status, message, error } = this.mapPrismaError(exception));
    }

    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url}`, exception as Error);
      // Erros não mapeados podem carregar caminho de arquivo, nome de tabela ou
      // detalhe de biblioteca. Ficam no log; o cliente recebe texto genérico.
      message = 'Erro interno do servidor';
      error = 'InternalServerError';
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private mapDomainError(e: DomainError): { status: number; error: string } {
    if (e instanceof NotFoundError) return { status: HttpStatus.NOT_FOUND, error: 'NotFound' };
    if (e instanceof ConflictError) return { status: HttpStatus.CONFLICT, error: 'Conflict' };
    if (e instanceof BusinessRuleError)
      return { status: HttpStatus.CONFLICT, error: 'BusinessRule' };
    if (e instanceof ValidationError)
      return { status: HttpStatus.BAD_REQUEST, error: 'ValidationError' };
    if (e instanceof ForbiddenError) return { status: HttpStatus.FORBIDDEN, error: 'Forbidden' };
    return { status: HttpStatus.BAD_REQUEST, error: 'DomainError' };
  }

  private mapPrismaError(e: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
    error: string;
  } {
    switch (e.code) {
      case 'P2002': {
        const target = (e.meta?.target as string[] | undefined)?.join(', ') ?? 'campo';
        return {
          status: HttpStatus.CONFLICT,
          message: `Já existe um registro com este valor (${target}).`,
          error: 'Conflict',
        };
      }
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Registro não encontrado.',
          error: 'NotFound',
        };
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          message: 'Operação viola integridade referencial.',
          error: 'Conflict',
        };
      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Erro na operação de banco de dados.',
          error: 'DatabaseError',
        };
    }
  }
}
