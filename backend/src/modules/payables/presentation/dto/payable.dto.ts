import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoriaDespesa, FormaPagamento, StatusContaPagar } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '@core/common/dto/pagination-query.dto';

/** Teto da repetição mensal: 5 anos. Acima disso é erro de digitação. */
const MAX_REPETICOES = 60;

export class PayableQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: StatusContaPagar })
  @IsOptional()
  @IsEnum(StatusContaPagar)
  status?: StatusContaPagar;

  @ApiPropertyOptional({ enum: CategoriaDespesa })
  @IsOptional()
  @IsEnum(CategoriaDespesa)
  categoria?: CategoriaDespesa;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fornecedorId?: string;

  // `search` (busca na descrição) vem de PaginationQueryDto.

  @ApiPropertyOptional({ example: '2026-09-01', description: 'Vencimento a partir de' })
  @IsOptional()
  @IsDateString()
  vencimentoDe?: string;

  @ApiPropertyOptional({ example: '2026-09-30', description: 'Vencimento até' })
  @IsOptional()
  @IsDateString()
  vencimentoAte?: string;

  @ApiPropertyOptional({
    description: 'Apenas contas vencidas e ainda não quitadas',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  vencidas?: boolean;
}

export class CreatePayableDto {
  @ApiProperty({ example: 'Aluguel da loja' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  descricao!: string;

  @ApiPropertyOptional({ enum: CategoriaDespesa, default: CategoriaDespesa.OUTROS })
  @IsOptional()
  @IsEnum(CategoriaDespesa)
  categoria?: CategoriaDespesa;

  @ApiPropertyOptional({ description: 'Obrigatório apenas quando a despesa é de fornecedor' })
  @IsOptional()
  @IsUUID()
  fornecedorId?: string;

  @ApiProperty({ example: 1800 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valor!: number;

  @ApiProperty({ example: '2026-10-05' })
  @IsDateString()
  vencimento!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;

  @ApiPropertyOptional({
    example: 12,
    description:
      'Gera esta quantidade de contas mensais a partir do vencimento informado (1 = só a conta atual).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_REPETICOES)
  repetirMeses?: number;
}

export class UpdatePayableDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  descricao?: string;

  @ApiPropertyOptional({ enum: CategoriaDespesa })
  @IsOptional()
  @IsEnum(CategoriaDespesa)
  categoria?: CategoriaDespesa;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  fornecedorId?: string | null;

  @ApiPropertyOptional({ example: 1800 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valor?: number;

  @ApiPropertyOptional({ example: '2026-10-05' })
  @IsOptional()
  @IsDateString()
  vencimento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;
}

export class RegisterPayablePaymentDto {
  @ApiProperty({ example: 1800 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valor!: number;

  @ApiProperty({ enum: FormaPagamento, example: FormaPagamento.PIX })
  @IsEnum(FormaPagamento)
  formaPagamento!: FormaPagamento;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  observacoes?: string;
}

export class PayableListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() descricao!: string;
  @ApiProperty({ enum: CategoriaDespesa }) categoria!: CategoriaDespesa;
  @ApiProperty({ nullable: true }) fornecedorId!: string | null;
  @ApiProperty({ nullable: true }) fornecedorNome!: string | null;
  @ApiProperty() valorOriginal!: number;
  @ApiProperty() valorPago!: number;
  @ApiProperty() saldo!: number;
  @ApiProperty({ enum: StatusContaPagar }) status!: StatusContaPagar;
  @ApiProperty() vencimento!: Date;
  /** Dias até o vencimento; negativo quando já venceu. Null para conta encerrada. */
  @ApiProperty({ nullable: true }) diasParaVencer!: number | null;
  @ApiProperty() vencida!: boolean;
  @ApiProperty({ nullable: true }) observacoes!: string | null;
  @ApiProperty() criadoEm!: Date;
}

export class PayablePaymentItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() valor!: number;
  @ApiProperty({ enum: FormaPagamento }) formaPagamento!: FormaPagamento;
  @ApiProperty({ nullable: true }) observacoes!: string | null;
  @ApiProperty({ nullable: true }) usuarioNome!: string | null;
  @ApiProperty() data!: Date;
}

export class PayableDetailDto extends PayableListItemDto {
  @ApiProperty({ nullable: true }) grupoRecorrencia!: string | null;
  @ApiProperty({ nullable: true }) criadoPorNome!: string | null;
  @ApiProperty({ type: [PayablePaymentItemDto] }) pagamentos!: PayablePaymentItemDto[];
}

export class PayableCategoryTotalDto {
  @ApiProperty({ enum: CategoriaDespesa }) categoria!: CategoriaDespesa;
  @ApiProperty() total!: number;
  @ApiProperty() quantidade!: number;
}

export class PayableSummaryDto {
  @ApiProperty({ description: 'Saldo devedor de tudo que está aberto/parcial' })
  totalEmAberto!: number;
  @ApiProperty() totalVencido!: number;
  @ApiProperty() quantidadeVencidas!: number;
  @ApiProperty({ description: 'Vence nos próximos 7 dias (ainda não vencidas)' })
  totalAVencer7Dias!: number;
  @ApiProperty() quantidadeAVencer7Dias!: number;
  @ApiProperty({ description: 'Efetivamente pago no mês corrente' })
  pagoNoMes!: number;
  @ApiProperty({ type: [PayableCategoryTotalDto], description: 'Aberto por categoria' })
  porCategoria!: PayableCategoryTotalDto[];
}
