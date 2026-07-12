import { Injectable } from '@nestjs/common';
import { Fornecedor, Prisma } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import {
  CreateSupplierData,
  FindSuppliersParams,
  ISupplierRepository,
  UpdateSupplierData,
} from '../domain/supplier.repository';

@Injectable()
export class PrismaSupplierRepository implements ISupplierRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateSupplierData): Promise<Fornecedor> {
    return this.prisma.fornecedor.create({ data });
  }

  findById(id: string): Promise<Fornecedor | null> {
    return this.prisma.fornecedor.findUnique({ where: { id } });
  }

  async findMany(params: FindSuppliersParams): Promise<[Fornecedor[], number]> {
    const where: Prisma.FornecedorWhereInput = {
      ...(params.ativo !== undefined ? { ativo: params.ativo } : {}),
      ...(params.search
        ? {
            OR: [
              { nome: { contains: params.search, mode: 'insensitive' } },
              { telefone: { contains: params.search } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.fornecedor.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: params.orderBy,
      }),
      this.prisma.fornecedor.count({ where }),
    ]);
  }

  update(id: string, data: UpdateSupplierData): Promise<Fornecedor> {
    return this.prisma.fornecedor.update({ where: { id }, data });
  }

  setActive(id: string, ativo: boolean): Promise<Fornecedor> {
    return this.prisma.fornecedor.update({ where: { id }, data: { ativo } });
  }
}
