import { z } from 'zod';
import { senhaForte } from '@/lib/password';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  // Sem política no login: contas criadas antes da regra atual continuam válidas.
  senha: z.string().min(1, 'Informe a senha'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const forgotSchema = z.object({
  email: z.string().email('E-mail inválido'),
});
export type ForgotForm = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({
    token: z.string().min(1, 'Informe o token'),
    novaSenha: senhaForte,
    confirmar: z.string().min(1, 'Confirme a senha'),
  })
  .refine((d) => d.novaSenha === d.confirmar, {
    message: 'As senhas não coincidem',
    path: ['confirmar'],
  });
export type ResetForm = z.infer<typeof resetSchema>;
