import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Categoria } from '@prisma/client';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '@core/common/dto/pagination-query.dto';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Bebidas' })
  @IsString()
  @MinLength(2)
  nome!: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Bebidas geladas' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class CategoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por status ativo' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  ativo?: boolean;
}

export class CategoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty() ativo!: boolean;
  @ApiProperty() criadoEm!: Date;

  static fromEntity(c: Categoria): CategoryResponseDto {
    return { id: c.id, nome: c.nome, ativo: c.ativo, criadoEm: c.criadoEm };
  }
}
