import { Injectable } from '@nestjs/common';
import { Categoria, Prisma } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import { FindManyParams, ICategoryRepository } from '../domain/category.repository';

@Injectable()
export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { nome: string }): Promise<Categoria> {
    return this.prisma.categoria.create({ data });
  }

  findById(id: string): Promise<Categoria | null> {
    return this.prisma.categoria.findUnique({ where: { id } });
  }

  findByNome(nome: string): Promise<Categoria | null> {
    return this.prisma.categoria.findUnique({ where: { nome } });
  }

  async findMany(params: FindManyParams): Promise<[Categoria[], number]> {
    const where: Prisma.CategoriaWhereInput = {
      ...(params.search ? { nome: { contains: params.search, mode: 'insensitive' } } : {}),
      ...(params.ativo !== undefined ? { ativo: params.ativo } : {}),
    };
    return this.prisma.$transaction([
      this.prisma.categoria.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: params.orderBy,
      }),
      this.prisma.categoria.count({ where }),
    ]);
  }

  update(id: string, data: { nome?: string; ativo?: boolean }): Promise<Categoria> {
    return this.prisma.categoria.update({ where: { id }, data });
  }

  countProdutos(id: string): Promise<number> {
    return this.prisma.produto.count({ where: { categoriaId: id } });
  }
}
