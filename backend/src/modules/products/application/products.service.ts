import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResponseDto } from '@core/common/dto/paginated-response.dto';
import { ConflictError, NotFoundError } from '@core/errors/domain.errors';
import { CATEGORY_REPOSITORY, ICategoryRepository } from '@modules/categories/domain/category.repository';
import { IProductRepository, PRODUCT_REPOSITORY } from '../domain/product.repository';
import {
  CreateProductDto,
  ProductQueryDto,
  ProductResponseDto,
  UpdateProductDto,
} from '../presentation/dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly repo: IProductRepository,
    @Inject(CATEGORY_REPOSITORY) private readonly categories: ICategoryRepository,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    const categoria = await this.categories.findById(dto.categoriaId);
    if (!categoria) throw new NotFoundError('Categoria', dto.categoriaId);

    if (dto.codigoBarras) {
      const existente = await this.repo.findByCodigoBarras(dto.codigoBarras);
      if (existente) throw new ConflictError('Já existe um produto com este código de barras.');
    }

    const produto = await this.repo.create({
      nome: dto.nome,
      codigoBarras: dto.codigoBarras ?? null,
      categoriaId: dto.categoriaId,
      precoCompra: dto.precoCompra,
      precoVenda: dto.precoVenda,
      estoque: dto.estoque ?? 0,
      estoqueMinimo: dto.estoqueMinimo,
      unidade: dto.unidade,
    });
    return ProductResponseDto.fromEntity(produto);
  }

  async list(query: ProductQueryDto): Promise<PaginatedResponseDto<ProductResponseDto>> {
    const [data, total] = await this.repo.findMany({
      skip: query.skip,
      take: query.limit,
      search: query.search,
      categoriaId: query.categoriaId,
      ativo: query.ativo,
      orderBy: query.orderBy('nome', 'asc') as Record<string, 'asc' | 'desc'>,
    });
    return new PaginatedResponseDto(
      data.map(ProductResponseDto.fromEntity),
      total,
      query.page,
      query.limit,
    );
  }

  async search(termo: string): Promise<ProductResponseDto[]> {
    if (!termo?.trim()) return [];
    const produtos = await this.repo.search(termo.trim(), 20);
    return produtos.map(ProductResponseDto.fromEntity);
  }

  async get(id: string): Promise<ProductResponseDto> {
    const produto = await this.repo.findById(id);
    if (!produto) throw new NotFoundError('Produto', id);
    return ProductResponseDto.fromEntity(produto);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    const produto = await this.repo.findById(id);
    if (!produto) throw new NotFoundError('Produto', id);

    if (dto.categoriaId && dto.categoriaId !== produto.categoriaId) {
      const categoria = await this.categories.findById(dto.categoriaId);
      if (!categoria) throw new NotFoundError('Categoria', dto.categoriaId);
    }

    if (dto.codigoBarras && dto.codigoBarras !== produto.codigoBarras) {
      const existente = await this.repo.findByCodigoBarras(dto.codigoBarras);
      if (existente) throw new ConflictError('Já existe um produto com este código de barras.');
    }

    const atualizado = await this.repo.update(id, dto);
    return ProductResponseDto.fromEntity(atualizado);
  }

  async setStatus(id: string, ativo: boolean): Promise<ProductResponseDto> {
    const produto = await this.repo.findById(id);
    if (!produto) throw new NotFoundError('Produto', id);
    const atualizado = await this.repo.setActive(id, ativo);
    return ProductResponseDto.fromEntity(atualizado);
  }
}
