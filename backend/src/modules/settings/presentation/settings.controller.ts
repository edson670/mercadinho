import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { Role } from '@prisma/client';
import { Public } from '@core/auth/public.decorator';
import { Roles } from '@core/auth/roles.decorator';
import { SettingsService } from '../application/settings.service';
import { UpdateSettingsDto } from './dto/settings.dto';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

/**
 * O `Content-Type` da parte multipart é enviado pelo cliente e pode ser
 * forjado — serve apenas como rejeição barata e antecipada. O que decide a
 * extensão gravada em disco é a assinatura binária verificada em
 * `detectarFormato`, nunca o nome do arquivo enviado.
 *
 * SVG está fora de propósito: é XML e executa <script> quando aberto direto
 * no navegador, o que daria XSS armazenado na mesma origem da aplicação.
 */
const MIME_ACEITOS = new Set(['image/png', 'image/jpeg', 'image/webp']);

/** Assinaturas (magic bytes) dos formatos aceitos → extensão de destino. */
function detectarFormato(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
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

@ApiTags('Configurações')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  // Leitura completa liberada a todos os perfis autenticados.
  @Get()
  @ApiOperation({ summary: 'Dados da empresa' })
  get() {
    return this.service.get();
  }

  // Pública e minimalista: só nome/logo, usados na tela de login antes de autenticar.
  @Public()
  @Get('branding')
  @ApiOperation({ summary: 'Nome e logotipo da empresa (público, para telas de login)' })
  async branding() {
    const { nome, logoUrl } = await this.service.get();
    return { nome, logoUrl };
  }

  @Patch()
  @Roles(Role.ADMINISTRADOR)
  @ApiOperation({ summary: 'Atualiza os dados da empresa' })
  update(@Body() dto: UpdateSettingsDto) {
    return this.service.update(dto);
  }

  @Post('logo')
  @Roles(Role.ADMINISTRADOR)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Envia o logotipo da empresa' })
  @UseInterceptors(
    FileInterceptor('file', {
      // Memória (limitada a 2MB) em vez de disco: o arquivo só é gravado depois
      // de validado, então nada não confiável chega à pasta servida publicamente.
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (!MIME_ACEITOS.has(file.mimetype)) {
          return cb(new BadRequestException('Envie uma imagem PNG, JPEG ou WEBP.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadLogo(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Nenhum arquivo enviado.');

    const formato = detectarFormato(file.buffer);
    if (!formato) {
      throw new BadRequestException('Arquivo não é uma imagem PNG, JPEG ou WEBP válida.');
    }

    if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
    // Nome inteiro gerado no servidor: nada do `originalname` chega ao disco.
    const filename = `logo-${randomUUID()}${formato.ext}`;
    await writeFile(join(UPLOADS_DIR, filename), file.buffer);

    return this.service.updateLogo(`/uploads/${filename}`);
  }
}
