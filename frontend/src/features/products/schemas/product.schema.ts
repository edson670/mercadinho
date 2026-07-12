import { z } from 'zod';

export const unidadeEnum = z.enum(['UN', 'KG', 'L', 'CX', 'PCT']);

export const productFormSchema = z
  .object({
    nome: z.string().min(2, 'Mínimo de 2 caracteres'),
    codigoBarras: z.string().optional(),
    categoriaId: z.string().uuid('Selecione uma categoria'),
    precoCompra: z.coerce.number().min(0, 'Valor inválido'),
    precoVenda: z.coerce.number().min(0, 'Valor inválido'),
    estoque: z.coerce.number().min(0).optional(),
    estoqueMinimo: z.coerce.number().min(0, 'Valor inválido'),
    unidade: unidadeEnum,
  })
  .refine((d) => d.precoVenda >= d.precoCompra, {
    message: 'Preço de venda não pode ser menor que o de compra',
    path: ['precoVenda'],
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const unidadeLabels: Record<z.infer<typeof unidadeEnum>, string> = {
  UN: 'Unidade',
  KG: 'Quilograma',
  L: 'Litro',
  CX: 'Caixa',
  PCT: 'Pacote',
};
