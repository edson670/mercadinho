import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';
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

export class MfaEnableDto {
  @ApiProperty({ example: '123456', description: 'Código de 6 dígitos do app autenticador' })
  @IsString()
  @Length(6, 8) // 8 cobre um código de recuperação usado por engano aqui
  codigo!: string;
}

export class MfaVerifyDto {
  @ApiProperty({ description: 'Token curto emitido pelo login quando MFA está ativo' })
  @IsString()
  mfaToken!: string;

  @ApiProperty({ example: '123456', description: 'Código do app autenticador ou de recuperação' })
  @IsString()
  @Length(6, 10)
  codigo!: string;
}

export class MfaDisableDto {
  @ApiProperty({ description: 'Confirmação de identidade — senha atual' })
  @IsString()
  senha!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 10)
  codigo!: string;
}
