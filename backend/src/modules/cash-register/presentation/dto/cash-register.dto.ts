import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusCaixa, TipoMovimentacaoCaixa } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PaginationQueryDto } from '@core/common/dto/pagination-query.dto';

export class OpenCashDto {
  @ApiProperty({ example: 100, description: 'Valor inicial em caixa' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorAbertura!: number;
}

export class CashMovementDto {
  @ApiProperty({ enum: TipoMovimentacaoCaixa })
  @IsEnum(TipoMovimentacaoCaixa)
  tipo!: TipoMovimentacaoCaixa;

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valor!: number;

  @ApiProperty({ example: 'Retirada para troco' })
  @IsString()
  @MinLength(3)
  motivo!: string;
}

export class CloseCashDto {
  @ApiPropertyOptional({ example: 350.5, description: 'Valor contado no fechamento' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorFechamento?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class CashHistoryQueryDto extends PaginationQueryDto {}

export class CashTotalsDto {
  @ApiProperty() totalVendas!: number;
  @ApiProperty() vendasDinheiro!: number;
  @ApiProperty() totalSangrias!: number;
  @ApiProperty() totalSuprimentos!: number;
  @ApiProperty({ description: 'Saldo esperado em dinheiro no caixa' })
  saldoEsperado!: number;
}

export class CashMovementItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: TipoMovimentacaoCaixa }) tipo!: TipoMovimentacaoCaixa;
  @ApiProperty() valor!: number;
  @ApiProperty({ nullable: true }) motivo!: string | null;
  @ApiProperty() criadoEm!: Date;
}

export class CashRegisterResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: StatusCaixa }) status!: StatusCaixa;
  @ApiProperty({ nullable: true }) usuarioNome!: string | null;
  @ApiProperty() valorAbertura!: number;
  @ApiProperty({ nullable: true }) valorFechamento!: number | null;
  @ApiProperty() abertoEm!: Date;
  @ApiProperty({ nullable: true }) fechadoEm!: Date | null;
  @ApiProperty({ type: CashTotalsDto }) totais!: CashTotalsDto;
  @ApiProperty({ nullable: true, description: 'valorFechamento - saldoEsperado' })
  diferenca!: number | null;
  @ApiProperty({ type: [CashMovementItemDto] }) movimentacoes!: CashMovementItemDto[];
}

export class CashHistoryItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: StatusCaixa }) status!: StatusCaixa;
  @ApiProperty({ nullable: true }) usuarioNome!: string | null;
  @ApiProperty() valorAbertura!: number;
  @ApiProperty({ nullable: true }) valorFechamento!: number | null;
  @ApiProperty({ nullable: true }) totalVendas!: number | null;
  @ApiProperty() abertoEm!: Date;
  @ApiProperty({ nullable: true }) fechadoEm!: Date | null;
}
