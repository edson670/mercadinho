import { z } from 'zod';

export const SENHA_MIN = 10;

/**
 * Espelha a política do backend (`SenhaForte`, em
 * core/common/validators/senha-forte.decorator.ts). Serve só para dar retorno
 * imediato ao usuário — quem decide é sempre o servidor.
 */
export const senhaForte = z
  .string()
  .min(SENHA_MIN, `Mínimo de ${SENHA_MIN} caracteres`)
  .max(128, 'Máximo de 128 caracteres')
  .regex(/[a-z]/, 'Inclua ao menos uma letra minúscula')
  .regex(/[A-Z]/, 'Inclua ao menos uma letra maiúscula')
  .regex(/\d/, 'Inclua ao menos um número');

export const REQUISITOS_SENHA = `Mínimo de ${SENHA_MIN} caracteres, com maiúscula, minúscula e número.`;
