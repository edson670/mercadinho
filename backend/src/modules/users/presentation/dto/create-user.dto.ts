import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Maria Souza' })
  @IsString()
  @MinLength(3)
  nome!: string;

  @ApiProperty({ example: 'maria@mercado.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Senha@123', minLength: 6 })
  @IsString()
  @MinLength(6)
  senha!: string;

  @ApiProperty({ enum: Role, example: Role.CAIXA })
  @IsEnum(Role)
  role!: Role;
}
