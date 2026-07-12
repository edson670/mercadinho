import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Unidade } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '@core/common/dto/pagination-query.dto';
import { ProductWithCategoria } from '../../domain/product.repository';

export class CreateProductDto {
  @ApiProperty({ example: 'Refrigerante 2L' })
  @IsString()
  @MinLength(2)
  nome!: string;

  @ApiPropertyOptional({ example: '7891234567890' })
  @IsOptional()
  @IsString()
  codigoBarras?: string;

  @ApiProperty()
  @IsUUID()
  categoriaId!: string;

  @ApiProperty({ example: 5.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precoCompra!: number;

  @ApiProperty({ example: 8.99 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precoVenda!: number;

  @ApiPropertyOptional({ example: 0, description: 'Estoque inicial (saldo de abertura)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  estoque?: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  estoqueMinimo!: number;

  @ApiProperty({ enum: Unidade, example: Unidade.UN })
  @IsEnum(Unidade)
  unidade!: Unidade;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codigoBarras?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precoCompra?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precoVenda?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  estoqueMinimo?: number;

  @ApiPropertyOptional({ enum: Unidade })
  @IsOptional()
  @IsEnum(Unidade)
  unidade?: Unidade;
}

export class ProductQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  ativo?: boolean;
}

export class ProductResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty({ nullable: true }) codigoBarras!: string | null;
  @ApiProperty() categoriaId!: string;
  @ApiProperty() categoriaNome!: string;
  @ApiProperty() precoCompra!: number;
  @ApiProperty() precoVenda!: number;
  @ApiProperty() estoque!: number;
  @ApiProperty() estoqueMinimo!: number;
  @ApiProperty({ enum: Unidade }) unidade!: Unidade;
  @ApiProperty() estoqueBaixo!: boolean;
  @ApiProperty() ativo!: boolean;
  @ApiProperty() criadoEm!: Date;

  static fromEntity(p: ProductWithCategoria): ProductResponseDto {
    const estoque = Number(p.estoque);
    const estoqueMinimo = Number(p.estoqueMinimo);
    return {
      id: p.id,
      nome: p.nome,
      codigoBarras: p.codigoBarras,
      categoriaId: p.categoriaId,
      categoriaNome: p.categoria.nome,
      precoCompra: Number(p.precoCompra),
      precoVenda: Number(p.precoVenda),
      estoque,
      estoqueMinimo,
      unidade: p.unidade,
      estoqueBaixo: estoque <= estoqueMinimo,
      ativo: p.ativo,
      criadoEm: p.criadoEm,
    };
  }
}
