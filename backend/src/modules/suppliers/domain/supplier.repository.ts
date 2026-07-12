import { Fornecedor } from '@prisma/client';

export const SUPPLIER_REPOSITORY = Symbol('SUPPLIER_REPOSITORY');

export interface CreateSupplierData {
  nome: string;
  telefone?: string | null;
  endereco?: string | null;
  observacoes?: string | null;
}

export type UpdateSupplierData = Partial<CreateSupplierData> & { ativo?: boolean };

export interface FindSuppliersParams {
  skip: number;
  take: number;
  search?: string;
  ativo?: boolean;
  orderBy: Record<string, 'asc' | 'desc'>;
}

export interface ISupplierRepository {
  create(data: CreateSupplierData): Promise<Fornecedor>;
  findById(id: string): Promise<Fornecedor | null>;
  findMany(params: FindSuppliersParams): Promise<[Fornecedor[], number]>;
  update(id: string, data: UpdateSupplierData): Promise<Fornecedor>;
  setActive(id: string, ativo: boolean): Promise<Fornecedor>;
}
