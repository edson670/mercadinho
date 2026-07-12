import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Mínimo de 6 caracteres'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const forgotSchema = z.object({
  email: z.string().email('E-mail inválido'),
});
export type ForgotForm = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({
    token: z.string().min(1, 'Informe o token'),
    novaSenha: z.string().min(6, 'Mínimo de 6 caracteres'),
    confirmar: z.string().min(6, 'Mínimo de 6 caracteres'),
  })
  .refine((d) => d.novaSenha === d.confirmar, {
    message: 'As senhas não coincidem',
    path: ['confirmar'],
  });
export type ResetForm = z.infer<typeof resetSchema>;
