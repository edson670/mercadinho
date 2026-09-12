import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '@core/database/prisma.service';
import { AuthUser } from '@core/auth/current-user.decorator';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
/**
 * Chaves removidas antes de gravar na auditoria. Vale tanto para o corpo da
 * requisição quanto para a RESPOSTA — é a resposta que carrega os segredos do
 * MFA: `/auth/mfa/setup` devolve o segredo TOTP em claro (`manualEntryKey`, e
 * o mesmo segredo embutido no `qrCodeDataUrl`) e `/auth/mfa/enable` devolve os
 * códigos de recuperação. Eles são cifrados/hasheados na tabela de usuários
 * justamente para ninguém conseguir lê-los; sem esta lista iam parar em texto
 * puro na auditoria, que ADMINISTRADOR e GERENTE consultam pela interface —
 * bastaria abrir o registro para clonar o segundo fator de outra pessoa.
 */
const SENSITIVE_KEYS = new Set([
  'senha',
  'senhaHash',
  'novaSenha',
  'token',
  'refreshToken',
  'accessToken',
  'resetToken',
  'codigo',
  'mfaToken',
  'mfaSecret',
  'mfaSecretCifrado',
  'manualEntryKey',
  'qrCodeDataUrl',
  'recoveryCodes',
  'mfaRecoveryCodesJson',
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
      tap({
        next: (responseBody) => {
          this.persist({
            usuarioId: user?.id,
            acao,
            entidade,
            entidadeId: paramId ?? this.extractId(responseBody),
            dadosAntes,
            dadosDepois: this.sanitize(responseBody),
            ip,
          });
        },
        // Sem este ramo, tentativa de login malsucedida, 403 do RBAC e violação
        // de regra de negócio não deixavam rastro nenhum — justamente os
        // eventos que interessam para detectar ataque (OWASP A09).
        error: (err: unknown) => {
          this.persist({
            usuarioId: user?.id,
            acao: `${acao} [FALHA]`,
            entidade,
            entidadeId: paramId,
            dadosAntes,
            dadosDepois: { erro: this.describeError(err) },
            ip,
          });
        },
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

  /** Status + motivo, sem stack trace (que poderia expor caminhos internos). */
  private describeError(err: unknown): string {
    if (err instanceof HttpException) return `${err.getStatus()} ${err.message}`;
    if (err instanceof Error) return err.message.slice(0, 300);
    return 'erro desconhecido';
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
