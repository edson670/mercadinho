import { Body, Controller, Get, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '@core/auth/public.decorator';
import { Roles } from '@core/auth/roles.decorator';
import {
  OPCOES_UPLOAD_IMAGEM,
  removerImagem,
  salvarImagem,
} from '@core/common/upload/image-upload.util';
import { SettingsService } from '../application/settings.service';
import { UpdateSettingsDto } from './dto/settings.dto';

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
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiOperation({ summary: 'Envia o logotipo da empresa' })
  @UseInterceptors(FileInterceptor('file', OPCOES_UPLOAD_IMAGEM))
  async uploadLogo(@UploadedFile() file?: Express.Multer.File) {
    const url = await salvarImagem(file?.buffer, 'logo');
    const anterior = (await this.service.get()).logoUrl;

    const atualizado = await this.service.updateLogo(url);
    // A logo antiga não é mais referenciada por nada: sem isto cada troca
    // deixava um arquivo para sempre na pasta pública. Só depois de a nova
    // estar gravada e registrada, para uma falha aqui não deixar a
    // configuração apontando para um arquivo que não existe mais.
    await removerImagem(anterior, 'logo');
    return atualizado;
  }
}
