import { Injectable } from '@nestjs/common';
import { Cliente, Prisma } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import {
  CreateCustomerData,
  FindCustomersParams,
  ICustomerRepository,
  UpdateCustomerData,
} from '../domain/customer.repository';

@Injectable()
export class PrismaCustomerRepository implements ICustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateCustomerData): Promise<Cliente> {
    return this.prisma.cliente.create({ data });
  }

  findById(id: string): Promise<Cliente | null> {
    return this.prisma.cliente.findUnique({ where: { id } });
  }

  findByCpf(cpf: string): Promise<Cliente | null> {
    return this.prisma.cliente.findUnique({ where: { cpf } });
  }

  async findMany(params: FindCustomersParams): Promise<[Cliente[], number]> {
    const where: Prisma.ClienteWhereInput = {
      ...(params.ativo !== undefined ? { ativo: params.ativo } : {}),
      ...(params.search
        ? {
            OR: [
              { nome: { contains: params.search, mode: 'insensitive' } },
              { cpf: { contains: params.search } },
              { telefone: { contains: params.search } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.cliente.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: params.orderBy,
      }),
      this.prisma.cliente.count({ where }),
    ]);
  }

  update(id: string, data: UpdateCustomerData): Promise<Cliente> {
    return this.prisma.cliente.update({ where: { id }, data });
  }

  setActive(id: string, ativo: boolean): Promise<Cliente> {
    return this.prisma.cliente.update({ where: { id }, data: { ativo } });
  }
}
