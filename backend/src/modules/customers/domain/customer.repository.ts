import { Cliente } from '@prisma/client';

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');

export interface CreateCustomerData {
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  observacoes?: string | null;
}

export type UpdateCustomerData = Partial<CreateCustomerData> & { ativo?: boolean };

export interface FindCustomersParams {
  skip: number;
  take: number;
  search?: string;
  ativo?: boolean;
  orderBy: Record<string, 'asc' | 'desc'>;
}

export interface ICustomerRepository {
  create(data: CreateCustomerData): Promise<Cliente>;
  findById(id: string): Promise<Cliente | null>;
  findByCpf(cpf: string): Promise<Cliente | null>;
  findMany(params: FindCustomersParams): Promise<[Cliente[], number]>;
  update(id: string, data: UpdateCustomerData): Promise<Cliente>;
  setActive(id: string, ativo: boolean): Promise<Cliente>;
}
