import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@core/common/dto/pagination-query.dto';

export class AuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  usuarioId?: string;

  @ApiPropertyOptional({ description: 'Nome do módulo, ex.: products, sales' })
  @IsOptional()
  @IsString()
  entidade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}

export class AuditListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) usuarioNome!: string | null;
  @ApiProperty() acao!: string;
  @ApiProperty() entidade!: string;
  @ApiProperty({ nullable: true }) entidadeId!: string | null;
  @ApiProperty({ nullable: true }) ip!: string | null;
  @ApiProperty() criadoEm!: Date;
}

export class AuditDetailDto extends AuditListItemDto {
  @ApiProperty({ nullable: true }) dadosAntes!: unknown;
  @ApiProperty({ nullable: true }) dadosDepois!: unknown;
}
