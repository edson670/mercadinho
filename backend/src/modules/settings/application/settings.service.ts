import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { SettingsResponseDto, UpdateSettingsDto } from '../presentation/dto/settings.dto';

/** Configuração da empresa: registro único (singleton). */
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<SettingsResponseDto> {
    const config = await this.ensureExists();
    return SettingsResponseDto.fromEntity(config);
  }

  async update(dto: UpdateSettingsDto): Promise<SettingsResponseDto> {
    const config = await this.ensureExists();
    const atualizado = await this.prisma.configuracao.update({
      where: { id: config.id },
      data: dto,
    });
    return SettingsResponseDto.fromEntity(atualizado);
  }

  async updateLogo(logoUrl: string): Promise<SettingsResponseDto> {
    const config = await this.ensureExists();
    const atualizado = await this.prisma.configuracao.update({
      where: { id: config.id },
      data: { logoUrl },
    });
    return SettingsResponseDto.fromEntity(atualizado);
  }

  /** Garante que o registro singleton exista (seed já cria um; isto é uma rede de segurança). */
  private async ensureExists() {
    const existente = await this.prisma.configuracao.findFirst();
    if (existente) return existente;
    return this.prisma.configuracao.create({ data: { nome: 'Meu Mercadinho' } });
  }
}
