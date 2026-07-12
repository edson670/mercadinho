import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Fornecedor } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { PaginationQueryDto } from '@core/common/dto/pagination-query.dto';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Distribuidora Central' })
  @IsString()
  @MinLength(2)
  nome!: string;

  @ApiPropertyOptional({ example: '(11) 3333-0000' })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endereco?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class UpdateSupplierDto extends CreateSupplierDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class SupplierQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  ativo?: boolean;
}

export class SupplierResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty({ nullable: true }) telefone!: string | null;
  @ApiProperty({ nullable: true }) endereco!: string | null;
  @ApiProperty({ nullable: true }) observacoes!: string | null;
  @ApiProperty() ativo!: boolean;
  @ApiProperty() criadoEm!: Date;

  static fromEntity(f: Fornecedor): SupplierResponseDto {
    return {
      id: f.id,
      nome: f.nome,
      telefone: f.telefone,
      endereco: f.endereco,
      observacoes: f.observacoes,
      ativo: f.ativo,
      criadoEm: f.criadoEm,
    };
  }
}
