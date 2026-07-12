import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '@core/database/prisma.service';
import { AuthUser } from '@core/auth/current-user.decorator';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_KEYS = new Set([
  'senha',
  'senhaHash',
  'novaSenha',
  'token',
  'refreshToken',
  'accessToken',
  'resetToken',
]);

/**
 * Registra automaticamente toda requisição mutável (POST/PUT/PATCH/DELETE)
 * na tabela Auditoria, sem exigir que cada use case chame um serviço de log.
 * Falha de auditoria nunca derruba a resposta ao cliente.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!MUTATING_METHODS.has(request.method)) {
      return next.handle();
    }

    const user = (request as Request & { user?: AuthUser }).user;
    const path = (request.route?.path as string | undefined) ?? request.path;
    const entidade = this.extractEntity(path);
    const acao = `${request.method} ${path}`;
    const dadosAntes = this.sanitize(request.body);
    const ip = request.ip ?? (request.headers['x-forwarded-for'] as string) ?? null;
    const paramId = (request.params as Record<string, string> | undefined)?.id ?? null;

    return next.handle().pipe(
      tap((responseBody) => {
        const entidadeId = paramId ?? this.extractId(responseBody);
        this.persist({
          usuarioId: user?.id,
          acao,
          entidade,
          entidadeId,
          dadosAntes,
          dadosDepois: this.sanitize(responseBody),
          ip,
        });
      }),
    );
  }

  private persist(data: {
    usuarioId?: string;
    acao: string;
    entidade: string;
    entidadeId: string | null;
    dadosAntes: unknown;
    dadosDepois: unknown;
    ip: string | null;
  }): void {
    this.prisma.auditoria
      .create({
        data: {
          usuarioId: data.usuarioId,
          acao: data.acao,
          entidade: data.entidade,
          entidadeId: data.entidadeId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dadosAntes: data.dadosAntes as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dadosDepois: data.dadosDepois as any,
          ip: data.ip,
        },
      })
      .catch(() => {
        /* auditoria nunca deve quebrar a requisição original */
      });
  }

  private extractEntity(path: string): string {
    return path.split('/').filter(Boolean)[0] ?? 'desconhecido';
  }

  private extractId(body: unknown): string | null {
    if (body && typeof body === 'object' && 'id' in body) {
      const id = (body as { id?: unknown }).id;
      return typeof id === 'string' ? id : null;
    }
    return null;
  }

  private sanitize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    let clone: unknown;
    try {
      clone = JSON.parse(JSON.stringify(value));
    } catch {
      return null;
    }
    this.strip(clone);
    return clone;
  }

  private strip(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach((v) => this.strip(v));
      return;
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      for (const key of Object.keys(obj)) {
        if (SENSITIVE_KEYS.has(key)) {
          delete obj[key];
        } else {
          this.strip(obj[key]);
        }
      }
    }
  }
}
