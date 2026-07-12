import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Configuracao } from '@prisma/client';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 'Meu Mercadinho' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  nome?: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-90' })
  @IsOptional()
  @IsString()
  cnpj?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endereco?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefone?: string;
}

export class SettingsResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty({ nullable: true }) cnpj!: string | null;
  @ApiProperty({ nullable: true }) endereco!: string | null;
  @ApiProperty({ nullable: true }) telefone!: string | null;
  @ApiProperty({ nullable: true }) logoUrl!: string | null;
  @ApiProperty() atualizadoEm!: Date;

  static fromEntity(c: Configuracao): SettingsResponseDto {
    return {
      id: c.id,
      nome: c.nome,
      cnpj: c.cnpj,
      endereco: c.endereco,
      telefone: c.telefone,
      logoUrl: c.logoUrl,
      atualizadoEm: c.atualizadoEm,
    };
  }
}
