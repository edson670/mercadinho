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

  @ApiPropertyOptional({ example: 'Garrafa 2 litros, gelada' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ description: 'URL da imagem exibida no catálogo' })
  @IsOptional()
  @IsString()
  imagemUrl?: string;

  @ApiPropertyOptional({ example: 7.49, description: 'Preço promocional do catálogo (menor que o preço de venda)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precoPromocional?: number;

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
  descricao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imagemUrl?: string;

  @ApiPropertyOptional({ description: 'Preço promocional (null remove a promoção)', nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precoPromocional?: number;

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
  @ApiProperty({ nullable: true }) descricao!: string | null;
  @ApiProperty({ nullable: true }) imagemUrl!: string | null;
  @ApiProperty({ nullable: true }) codigoBarras!: string | null;
  @ApiProperty() categoriaId!: string;
  @ApiProperty() categoriaNome!: string;
  @ApiProperty() precoCompra!: number;
  @ApiProperty() precoVenda!: number;
  @ApiProperty({ nullable: true }) precoPromocional!: number | null;
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
      descricao: p.descricao,
      imagemUrl: p.imagemUrl,
      codigoBarras: p.codigoBarras,
      categoriaId: p.categoriaId,
      categoriaNome: p.categoria.nome,
      precoCompra: Number(p.precoCompra),
      precoVenda: Number(p.precoVenda),
      precoPromocional: p.precoPromocional ? Number(p.precoPromocional) : null,
      estoque,
      estoqueMinimo,
      unidade: p.unidade,
      estoqueBaixo: estoque <= estoqueMinimo,
      ativo: p.ativo,
      criadoEm: p.criadoEm,
    };
  }
}
