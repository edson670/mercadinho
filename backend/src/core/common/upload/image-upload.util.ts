import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { basename, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';

/**
 * Regras de upload de imagem, num lugar só — usadas pela logo da empresa e
 * pela imagem do produto. Concentrar aqui evita que uma cópia divergente de
 * outra abra uma brecha que a auditoria já tinha fechado.
 */

export const UPLOADS_DIR = join(process.cwd(), 'uploads');
export const TAMANHO_MAX_BYTES = 2 * 1024 * 1024;

/**
 * O `Content-Type` da parte multipart é enviado pelo cliente e pode ser
 * forjado — serve só como rejeição barata e antecipada. Quem decide a
 * extensão gravada é a assinatura binária (`detectarFormato`), nunca o nome
 * nem o mimetype declarado.
 *
 * SVG está fora de propósito: é XML e executa <script> ao abrir direto no
 * navegador, o que seria XSS armazenado na mesma origem da aplicação.
 */
export const MIME_ACEITOS = new Set(['image/png', 'image/jpeg', 'image/webp']);

/** Assinaturas (magic bytes) dos formatos aceitos → extensão de destino. */
export function detectarFormato(buf: Buffer): { ext: string; mime: string } | null {
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { ext: '.png', mime: 'image/png' };
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: '.jpg', mime: 'image/jpeg' };
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: '.webp', mime: 'image/webp' };
  }
  return null;
}

/**
 * Opções do FileInterceptor: memória (não disco) até estar validado, teto de
 * 2MB, um arquivo, e recusa antecipada por mimetype.
 */
export const OPCOES_UPLOAD_IMAGEM: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: TAMANHO_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!MIME_ACEITOS.has(file.mimetype)) {
      return cb(new BadRequestException('Envie uma imagem PNG, JPEG ou WEBP.'), false);
    }
    cb(null, true);
  },
};

/**
 * Valida o conteúdo por magic bytes e grava com nome gerado no servidor
 * (`<prefixo>-<uuid>.<ext>`). Nada do `originalname` chega ao disco. Devolve
 * a URL pública (`/uploads/...`). Lança BadRequest se não for imagem válida.
 */
export async function salvarImagem(buffer: Buffer | undefined, prefixo: string): Promise<string> {
  if (!buffer?.length) throw new BadRequestException('Nenhum arquivo enviado.');

  const formato = detectarFormato(buffer);
  if (!formato) {
    throw new BadRequestException('Arquivo não é uma imagem PNG, JPEG ou WEBP válida.');
  }

  if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
  const filename = `${prefixo}-${randomUUID()}${formato.ext}`;
  await writeFile(join(UPLOADS_DIR, filename), buffer);
  return `/uploads/${filename}`;
}

/**
 * Remove uma imagem da pasta de uploads. Só apaga arquivo da própria pasta e
 * com o prefixo esperado — nunca um caminho externo montado por outra fonte.
 * Silencioso: um arquivo já ausente não é erro.
 */
export async function removerImagem(
  url: string | null | undefined,
  prefixo: string,
): Promise<void> {
  if (!url?.startsWith('/uploads/')) return;
  const nome = basename(url);
  if (!nome.startsWith(`${prefixo}-`)) return;
  await unlink(join(UPLOADS_DIR, nome)).catch(() => undefined);
}
