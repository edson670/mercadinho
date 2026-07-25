import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { SenhaForte } from '@core/common/validators/senha-forte.decorator';

export class CreateUserDto {
  @ApiProperty({ example: 'Maria Souza' })
  @IsString()
  @MinLength(3)
  nome!: string;

  @ApiProperty({ example: 'maria@mercado.local' })
  @IsEmail()
  email!: string;

  @SenhaForte()
  senha!: string;

  @ApiProperty({ enum: Role, example: Role.CAIXA })
  @IsEnum(Role)
  role!: Role;
}
