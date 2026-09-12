import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormaPagamentoPedido, StatusPedido } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '@core/common/dto/pagination-query.dto';

/** Remove tudo que não for dígito do telefone (aceita formatos variados do cliente). */
const onlyDigits = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/\D/g, '') : value;

export class OrderItemDto {
  @ApiProperty()
  @IsUUID()
  produtoId!: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantidade!: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome!: string;

  @ApiProperty({ example: '11999990000', description: 'Somente dígitos (DDD + número)' })
  @Transform(onlyDigits)
  @IsString()
  @Matches(/^\d{10,13}$/, { message: 'telefone deve ter entre 10 e 13 dígitos' })
  telefone!: string;

  @ApiProperty({ example: 'Rua das Flores' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  logradouro!: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  numeroEndereco!: string;

  @ApiPropertyOptional({ example: 'Apto 12' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  complemento?: string;

  @ApiProperty({ example: 'Centro' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  bairro!: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  cidade!: string;

  @ApiPropertyOptional({ example: 'Portão azul, ao lado da padaria' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  referencia?: string;

  @ApiProperty({ enum: FormaPagamentoPedido })
  @IsEnum(FormaPagamentoPedido)
  formaPagamento!: FormaPagamentoPedido;

  @ApiPropertyOptional({ example: 100, description: 'Obrigatório apenas quando pagamento = DINHEIRO' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  trocoPara?: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;

  @ApiPropertyOptional({ description: 'UUID gerado pelo catálogo — repetição retorna o mesmo pedido' })
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;

  /**
   * Código do link enviado por WhatsApp (`/catalogo?s=...`). É o que prova que
   * do outro lado existe um número de telefone real que conversou com a loja.
   * Sem ele o endereço público aceitaria pedidos anônimos com telefone e
   * endereço inventados — e como criar pedido baixa estoque, daria para zerar
   * o estoque da loja com pedidos que nunca seriam retirados.
   */
  @ApiProperty({ description: 'Código da sessão recebida pelo link do WhatsApp' })
  @IsString()
  @Matches(/^[A-Za-z0-9]{8}$/, { message: 'sessão inválida' })
  sessionToken!: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  itens!: OrderItemDto[];
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: StatusPedido, description: 'CANCELADO não é aceito aqui — use POST /orders/:id/cancel' })
  @IsEnum(StatusPedido)
  status!: StatusPedido;
}

export class OrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: StatusPedido })
  @IsOptional()
  @IsEnum(StatusPedido)
  status?: StatusPedido;

  @ApiPropertyOptional({ enum: FormaPagamentoPedido })
  @IsOptional()
  @IsEnum(FormaPagamentoPedido)
  formaPagamento?: FormaPagamentoPedido;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}
