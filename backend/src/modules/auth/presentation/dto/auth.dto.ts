import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';
import { SenhaForte } from '@core/common/validators/senha-forte.decorator';

export class LoginDto {
  @ApiProperty({ example: 'admin@mercado.local' })
  @IsEmail()
  email!: string;

  // Sem política aqui de propósito: o login apenas confere o hash. Aplicar as
  // regras de complexidade nesta rota quebraria contas antigas e sinalizaria a
  // política a quem estivesse tentando adivinhar a senha.
  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  senha!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@mercado.local' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recebido por e-mail' })
  @IsString()
  token!: string;

  @SenhaForte()
  novaSenha!: string;
}
