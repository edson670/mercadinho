import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormaPagamento, StatusFiado } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { PaginationQueryDto } from '@core/common/dto/pagination-query.dto';

export class CreditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: StatusFiado })
  @IsOptional()
  @IsEnum(StatusFiado)
  status?: StatusFiado;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clienteId?: string;
}

export class RegisterPaymentDto {
  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valor!: number;

  @ApiProperty({ enum: FormaPagamento, example: FormaPagamento.DINHEIRO })
  @IsEnum(FormaPagamento)
  formaPagamento!: FormaPagamento;
}

export class FiadoListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() clienteId!: string;
  @ApiProperty() clienteNome!: string;
  @ApiProperty({ nullable: true }) vendaNumero!: number | null;
  @ApiProperty() valorOriginal!: number;
  @ApiProperty() valorPago!: number;
  @ApiProperty() saldo!: number;
  @ApiProperty({ enum: StatusFiado }) status!: StatusFiado;
  @ApiProperty() criadoEm!: Date;
}

export class PaymentItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() valor!: number;
  @ApiProperty({ enum: FormaPagamento }) formaPagamento!: FormaPagamento;
  @ApiProperty({ nullable: true }) usuarioNome!: string | null;
  @ApiProperty() data!: Date;
}

export class FiadoDetailDto extends FiadoListItemDto {
  @ApiProperty({ type: [PaymentItemDto] }) pagamentos!: PaymentItemDto[];
}

export class OverdueCustomerDto {
  @ApiProperty() clienteId!: string;
  @ApiProperty() clienteNome!: string;
  @ApiProperty({ nullable: true }) telefone!: string | null;
  @ApiProperty() totalDevido!: number;
  @ApiProperty() quantidadeFiados!: number;
}
