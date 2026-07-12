import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResponseDto } from '@core/common/dto/paginated-response.dto';
import { BusinessRuleError, ConflictError, NotFoundError } from '@core/errors/domain.errors';
import { CATEGORY_REPOSITORY, ICategoryRepository } from '../domain/category.repository';
import {
  CategoryQueryDto,
  CategoryResponseDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../presentation/dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly repo: ICategoryRepository,
  ) {}

  async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    if (await this.repo.findByNome(dto.nome)) {
      throw new ConflictError('Já existe uma categoria com este nome.');
    }
    const categoria = await this.repo.create({ nome: dto.nome });
    return CategoryResponseDto.fromEntity(categoria);
  }

  async list(query: CategoryQueryDto): Promise<PaginatedResponseDto<CategoryResponseDto>> {
    const [data, total] = await this.repo.findMany({
      skip: query.skip,
      take: query.limit,
      search: query.search,
      ativo: query.ativo,
      orderBy: query.orderBy('nome', 'asc') as Record<string, 'asc' | 'desc'>,
    });
    return new PaginatedResponseDto(
      data.map(CategoryResponseDto.fromEntity),
      total,
      query.page,
      query.limit,
    );
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const categoria = await this.repo.findById(id);
    if (!categoria) throw new NotFoundError('Categoria', id);

    if (dto.nome && dto.nome !== categoria.nome) {
      const existente = await this.repo.findByNome(dto.nome);
      if (existente) throw new ConflictError('Já existe uma categoria com este nome.');
    }

    // Impede inativar categoria que ainda tem produtos vinculados.
    if (dto.ativo === false) {
      const produtos = await this.repo.countProdutos(id);
      if (produtos > 0) {
        throw new BusinessRuleError(
          `Não é possível inativar: ${produtos} produto(s) vinculado(s) a esta categoria.`,
        );
      }
    }

    const atualizada = await this.repo.update(id, { nome: dto.nome, ativo: dto.ativo });
    return CategoryResponseDto.fromEntity(atualizada);
  }
}
