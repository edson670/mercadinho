import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Valida as variáveis de ambiente no boot da aplicação.
 * Falha rápido: se algo essencial faltar, a API não sobe.
 */
class EnvironmentVariables {
  @IsOptional()
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  PORT: number = 3000;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRES = '15m';

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRES = '7d';

  @IsOptional()
  @IsString()
  API_PREFIX = 'api/v1';

  @IsOptional()
  @IsString()
  CORS_ORIGIN = 'http://localhost:5173';

  /**
   * Número de proxies reversos à frente da API (ou expressão aceita pelo
   * Express). Vazio em dev, onde não há proxy. Ver docs/12-deploy-producao.md.
   */
  @IsOptional()
  @IsString()
  TRUST_PROXY?: string;

  // ── Integração WhatsApp (Evolution API) ──
  // Sem estas variáveis o sistema funciona normalmente: as mensagens são
  // apenas registradas no banco e no log (ver docs/10-pedidos-whatsapp.md).
  @IsOptional()
  @IsString()
  EVOLUTION_BASE_URL?: string;

  @IsOptional()
  @IsString()
  EVOLUTION_API_KEY?: string;

  @IsOptional()
  @IsString()
  EVOLUTION_INSTANCE?: string;

  /** Segredo do webhook. Sem ele, o endpoint fica desabilitado (fail-closed). */
  @IsOptional()
  @IsString()
  WEBHOOK_SECRET?: string;

  @IsOptional()
  @IsString()
  CATALOG_PUBLIC_URL = 'http://localhost:5173/catalogo';
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `Configuração de ambiente inválida:\n${errors
        .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
        .join('\n')}`,
    );
  }
  return validated;
}
