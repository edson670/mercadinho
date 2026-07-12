import { Injectable } from '@nestjs/common';
import { Prisma, Produto } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import {
  CreateProductData,
  FindProductsParams,
  IProductRepository,
  ProductWithCategoria,
  UpdateProductData,
} from '../domain/product.repository';

const includeCategoria = { categoria: { select: { id: true, nome: true } } };

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateProductData): Promise<ProductWithCategoria> {
    return this.prisma.produto.create({ data, include: includeCategoria });
  }

  findById(id: string): Promise<ProductWithCategoria | null> {
    return this.prisma.produto.findUnique({ where: { id }, include: includeCategoria });
  }

  findByCodigoBarras(codigo: string): Promise<Produto | null> {
    return this.prisma.produto.findUnique({ where: { codigoBarras: codigo } });
  }

  async findMany(params: FindProductsParams): Promise<[ProductWithCategoria[], number]> {
    const where: Prisma.ProdutoWhereInput = {
      ...(params.categoriaId ? { categoriaId: params.categoriaId } : {}),
      ...(params.ativo !== undefined ? { ativo: params.ativo } : {}),
      ...(params.search
        ? {
            OR: [
              { nome: { contains: params.search, mode: 'insensitive' } },
              { codigoBarras: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.produto.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: params.orderBy,
        include: includeCategoria,
      }),
      this.prisma.produto.count({ where }),
    ]);
  }

  search(termo: string, limit: number): Promise<ProductWithCategoria[]> {
    return this.prisma.produto.findMany({
      where: {
        ativo: true,
        OR: [
          { nome: { contains: termo, mode: 'insensitive' } },
          { codigoBarras: { contains: termo, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { nome: 'asc' },
      include: includeCategoria,
    });
  }

  update(id: string, data: UpdateProductData): Promise<ProductWithCategoria> {
    return this.prisma.produto.update({ where: { id }, data, include: includeCategoria });
  }

  setActive(id: string, ativo: boolean): Promise<ProductWithCategoria> {
    return this.prisma.produto.update({
      where: { id },
      data: { ativo },
      include: includeCategoria,
    });
  }
}
