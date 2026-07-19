import { Produto, Unidade } from '@prisma/client';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface CreateProductData {
  nome: string;
  descricao?: string | null;
  imagemUrl?: string | null;
  codigoBarras?: string | null;
  categoriaId: string;
  precoCompra: number;
  precoVenda: number;
  precoPromocional?: number | null;
  estoque: number;
  estoqueMinimo: number;
  unidade: Unidade;
}

export type UpdateProductData = Partial<Omit<CreateProductData, 'estoque'>> & {
  ativo?: boolean;
};

export interface FindProductsParams {
  skip: number;
  take: number;
  search?: string;
  categoriaId?: string;
  ativo?: boolean;
  orderBy: Record<string, 'asc' | 'desc'>;
}

export type ProductWithCategoria = Produto & { categoria: { id: string; nome: string } };

export interface IProductRepository {
  create(data: CreateProductData): Promise<ProductWithCategoria>;
  findById(id: string): Promise<ProductWithCategoria | null>;
  findByCodigoBarras(codigo: string): Promise<Produto | null>;
  findMany(params: FindProductsParams): Promise<[ProductWithCategoria[], number]>;
  search(termo: string, limit: number): Promise<ProductWithCategoria[]>;
  update(id: string, data: UpdateProductData): Promise<ProductWithCategoria>;
  setActive(id: string, ativo: boolean): Promise<ProductWithCategoria>;
}
