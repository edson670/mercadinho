import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Cliente } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { PaginationQueryDto } from '@core/common/dto/pagination-query.dto';

export class CreateCustomerDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @MinLength(2)
  nome!: string;

  @ApiPropertyOptional({ example: '12345678909' })
  @IsOptional()
  @IsString()
  @Length(11, 14)
  cpf?: string;

  @ApiPropertyOptional({ example: '(11) 99999-0000' })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endereco?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class UpdateCustomerDto extends CreateCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class CustomerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  ativo?: boolean;
}

export class CustomerResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty({ nullable: true }) cpf!: string | null;
  @ApiProperty({ nullable: true }) telefone!: string | null;
  @ApiProperty({ nullable: true }) endereco!: string | null;
  @ApiProperty({ nullable: true }) observacoes!: string | null;
  @ApiProperty() ativo!: boolean;
  @ApiProperty() criadoEm!: Date;

  static fromEntity(c: Cliente): CustomerResponseDto {
    return {
      id: c.id,
      nome: c.nome,
      cpf: c.cpf,
      telefone: c.telefone,
      endereco: c.endereco,
      observacoes: c.observacoes,
      ativo: c.ativo,
      criadoEm: c.criadoEm,
    };
  }
}
