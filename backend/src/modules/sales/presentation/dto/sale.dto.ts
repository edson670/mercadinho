import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormaPagamento, StatusVenda } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '@core/common/dto/pagination-query.dto';

export class SaleItemDto {
  @ApiProperty()
  @IsUUID()
  produtoId!: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantidade!: number;
}

export class CreateSaleDto {
  @ApiPropertyOptional({ description: 'Obrigatório quando forma de pagamento = FIADO' })
  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @ApiProperty({ enum: FormaPagamento })
  @IsEnum(FormaPagamento)
  formaPagamento!: FormaPagamento;

  @ApiPropertyOptional({ example: 0, description: 'Desconto em valor (R$)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  desconto?: number;

  @ApiProperty({ type: [SaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  itens!: SaleItemDto[];
}

export class SaleQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ enum: FormaPagamento })
  @IsOptional()
  @IsEnum(FormaPagamento)
  formaPagamento?: FormaPagamento;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clienteId?: string;
}

export class SaleItemResponseDto {
  @ApiProperty() produtoId!: string;
  @ApiProperty() produtoNome!: string;
  @ApiProperty() quantidade!: number;
  @ApiProperty() precoUnitario!: number;
  @ApiProperty() subtotal!: number;
}

export class SaleListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() numero!: number;
  @ApiProperty({ nullable: true }) clienteNome!: string | null;
  @ApiProperty({ nullable: true }) usuarioNome!: string | null;
  @ApiProperty({ enum: FormaPagamento }) formaPagamento!: FormaPagamento;
  @ApiProperty({ enum: StatusVenda }) status!: StatusVenda;
  @ApiProperty() total!: number;
  @ApiProperty() data!: Date;
}

export class SaleDetailDto extends SaleListItemDto {
  @ApiProperty() subtotal!: number;
  @ApiProperty() desconto!: number;
  @ApiProperty({ type: [SaleItemResponseDto] }) itens!: SaleItemResponseDto[];
}
