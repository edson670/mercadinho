import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const SENHA_MIN = 10;
/**
 * Limite superior: argon2 processa a senha inteira, então uma entrada muito
 * grande vira vetor de DoS por CPU.
 */
export const SENHA_MAX = 128;

/**
 * Política de senha para definição/alteração — nunca no login, onde só
 * verificamos o hash (senhas antigas mais curtas continuam válidas, e validar
 * formato na entrada revelaria a política a quem tenta adivinhar).
 */
export function SenhaForte() {
  return applyDecorators(
    ApiProperty({
      example: 'Mercadinho@2026',
      minLength: SENHA_MIN,
      description: `Mínimo de ${SENHA_MIN} caracteres, com maiúscula, minúscula e número.`,
    }),
    IsString(),
    MinLength(SENHA_MIN, { message: `A senha deve ter no mínimo ${SENHA_MIN} caracteres.` }),
    MaxLength(SENHA_MAX, { message: `A senha deve ter no máximo ${SENHA_MAX} caracteres.` }),
    Matches(/[a-z]/, { message: 'A senha deve conter ao menos uma letra minúscula.' }),
    Matches(/[A-Z]/, { message: 'A senha deve conter ao menos uma letra maiúscula.' }),
    Matches(/\d/, { message: 'A senha deve conter ao menos um número.' }),
  );
}
