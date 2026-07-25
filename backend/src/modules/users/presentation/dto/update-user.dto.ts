import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { SenhaForte } from '@core/common/validators/senha-forte.decorator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Maria Souza' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  nome?: string;

  @ApiPropertyOptional({ example: 'maria@mercado.local' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @SenhaForte()
  senha?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
