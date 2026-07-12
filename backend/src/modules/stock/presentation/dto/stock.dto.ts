import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrigemMovimentacao, TipoMovimentacaoEstoque } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { PaginationQueryDto } from '@core/common/dto/pagination-query.dto';

export class StockEntryDto {
  @ApiProperty()
  @IsUUID()
  produtoId!: string;

  @ApiProperty({ example: 10, description: 'Quantidade a adicionar' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantidade!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivo?: string;
}

export class StockAdjustmentDto {
  @ApiProperty()
  @IsUUID()
  produtoId!: string;

  @ApiProperty({ example: 42, description: 'Nova quantidade absoluta em estoque' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  novaQuantidade!: number;

  @ApiProperty({ example: 'Correção de inventário' })
  @IsString()
  @MinLength(3)
  motivo!: string;
}

export class MovementQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  produtoId?: string;

  @ApiPropertyOptional({ enum: TipoMovimentacaoEstoque })
  @IsOptional()
  @IsEnum(TipoMovimentacaoEstoque)
  tipo?: TipoMovimentacaoEstoque;

  @ApiPropertyOptional({ description: 'Data inicial (ISO)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'Data final (ISO)' })
  @IsOptional()
  @IsString()
  to?: string;
}

export class MovementResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() produtoId!: string;
  @ApiProperty() produtoNome!: string;
  @ApiProperty({ enum: TipoMovimentacaoEstoque }) tipo!: TipoMovimentacaoEstoque;
  @ApiProperty({ enum: OrigemMovimentacao }) origem!: OrigemMovimentacao;
  @ApiProperty() quantidade!: number;
  @ApiProperty() estoqueAnterior!: number;
  @ApiProperty() estoqueResultante!: number;
  @ApiProperty({ nullable: true }) motivo!: string | null;
  @ApiProperty({ nullable: true }) usuarioNome!: string | null;
  @ApiProperty() criadoEm!: Date;
}

export class LowStockItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty() categoriaNome!: string;
  @ApiProperty() estoque!: number;
  @ApiProperty() estoqueMinimo!: number;
  @ApiProperty() unidade!: string;
}
