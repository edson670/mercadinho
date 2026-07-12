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
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { Role } from '@prisma/client';
import { Roles } from '@core/auth/roles.decorator';
import { SettingsService } from '../application/settings.service';
import { UpdateSettingsDto } from './dto/settings.dto';

const UPLOADS_DIR = join(process.cwd(), 'uploads');
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

@ApiTags('Configurações')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  // Leitura liberada a todos os perfis (nome/logo aparecem na UI).
  @Get()
  @ApiOperation({ summary: 'Dados da empresa' })
  get() {
    return this.service.get();
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
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
          cb(null, UPLOADS_DIR);
        },
        filename: (_req, file, cb) => cb(null, `logo-${randomUUID()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
          return cb(new BadRequestException('Envie uma imagem PNG, JPEG, WEBP ou SVG.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadLogo(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    return this.service.updateLogo(`/uploads/${file.filename}`);
  }
}
