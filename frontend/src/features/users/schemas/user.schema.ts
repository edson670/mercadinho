import { z } from 'zod';

export const roleEnum = z.enum(['ADMINISTRADOR', 'GERENTE', 'CAIXA']);

export const userFormSchema = z.object({
  nome: z.string().min(3, 'Mínimo de 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  role: roleEnum,
  // senha obrigatória na criação, opcional na edição (validado no componente)
  senha: z.string().min(6, 'Mínimo de 6 caracteres').optional().or(z.literal('')),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export const roleLabels: Record<z.infer<typeof roleEnum>, string> = {
  ADMINISTRADOR: 'Administrador',
  GERENTE: 'Gerente',
  CAIXA: 'Caixa',
};
