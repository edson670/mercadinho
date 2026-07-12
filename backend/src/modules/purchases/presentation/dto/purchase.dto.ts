import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '@core/common/dto/pagination-query.dto';

export class PurchaseItemDto {
  @ApiProperty()
  @IsUUID()
  produtoId!: string;

  @ApiProperty({ example: 24 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantidade!: number;

  @ApiProperty({ example: 3.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precoUnitario!: number;
}

export class CreatePurchaseDto {
  @ApiProperty()
  @IsUUID()
  fornecedorId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiProperty({ type: [PurchaseItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  itens!: PurchaseItemDto[];
}

export class PurchaseQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fornecedorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}

export class PurchaseListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() fornecedorNome!: string;
  @ApiProperty() valorTotal!: number;
  @ApiProperty() itensCount!: number;
  @ApiProperty({ nullable: true }) usuarioNome!: string | null;
  @ApiProperty() data!: Date;
}

export class PurchaseDetailItemDto {
  @ApiProperty() produtoId!: string;
  @ApiProperty() produtoNome!: string;
  @ApiProperty() quantidade!: number;
  @ApiProperty() precoUnitario!: number;
  @ApiProperty() subtotal!: number;
}

export class PurchaseDetailDto {
  @ApiProperty() id!: string;
  @ApiProperty() fornecedorId!: string;
  @ApiProperty() fornecedorNome!: string;
  @ApiProperty() valorTotal!: number;
  @ApiProperty({ nullable: true }) observacoes!: string | null;
  @ApiProperty({ nullable: true }) usuarioNome!: string | null;
  @ApiProperty() data!: Date;
  @ApiProperty({ type: [PurchaseDetailItemDto] }) itens!: PurchaseDetailItemDto[];
}
