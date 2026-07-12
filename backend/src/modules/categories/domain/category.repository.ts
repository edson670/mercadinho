import { Categoria } from '@prisma/client';

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export interface FindManyParams {
  skip: number;
  take: number;
  search?: string;
  ativo?: boolean;
  orderBy: Record<string, 'asc' | 'desc'>;
}

export interface ICategoryRepository {
  create(data: { nome: string }): Promise<Categoria>;
  findById(id: string): Promise<Categoria | null>;
  findByNome(nome: string): Promise<Categoria | null>;
  findMany(params: FindManyParams): Promise<[Categoria[], number]>;
  update(id: string, data: { nome?: string; ativo?: boolean }): Promise<Categoria>;
  countProdutos(id: string): Promise<number>;
}
