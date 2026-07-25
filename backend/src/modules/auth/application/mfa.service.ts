import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const RECOVERY_CODE_COUNT = 10;

/**
 * MFA por TOTP (RFC 6238) — achado B4 da análise de segurança. O segredo TOTP
 * nunca é gravado em claro no banco: é cifrado com AES-256-GCM antes de
 * `setMfaPendingSecret`/persistência. Diferente do digest usado em refresh
 * tokens (HashingService.tokenDigest), aqui a operação precisa ser reversível
 * — o servidor tem que decifrar o segredo para gerar o código esperado a cada
 * verificação, então hashing unidirecional não serve.
 */
@Injectable()
export class MfaService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const raw = config.get<string>('MFA_ENCRYPTION_KEY');
    this.key = raw
      ? Buffer.from(raw, 'base64')
      : // Fallback de conveniência para dev: deriva de um segredo que já é
        // obrigatório. Em produção, defina MFA_ENCRYPTION_KEY própria — ver
        // .env.example (gira independente do JWT, então rotacionar um não
        // invalida o outro).
        scryptSync(config.getOrThrow<string>('JWT_ACCESS_SECRET'), 'mercado-mfa-kdf-salt', 32);
  }

  gerarSegredo(email: string): { secret: string; otpauthUrl: string } {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(email, 'Mercadinho', secret);
    return { secret, otpauthUrl };
  }

  async gerarQrCodeDataUrl(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }

  verificarCodigo(secretCifrado: string, codigo: string): boolean {
    const secret = this.decifrar(secretCifrado);
    return authenticator.check(codigo, secret);
  }

  gerarCodigosRecuperacao(): string[] {
    // 5 bytes = 10 caracteres hex — memorável o bastante para digitar, com
    // entropia suficiente (40 bits) para um código de uso único.
    return Array.from({ length: RECOVERY_CODE_COUNT }, () => randomBytes(5).toString('hex'));
  }

  cifrar(plain: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
  }

  private decifrar(payload: string): string {
    const buf = Buffer.from(payload, 'base64');
    const iv = buf.subarray(0, IV_BYTES);
    const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const enc = buf.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }
}
