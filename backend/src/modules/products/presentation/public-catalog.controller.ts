import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@core/auth/public.decorator';
import { PaginatedResponseDto } from '@core/common/dto/paginated-response.dto';
import {
  CATEGORY_REPOSITORY,
  ICategoryRepository,
} from '@modules/categories/domain/category.repository';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
  ProductWithCategoria,
} from '../domain/product.repository';
import { ProductQueryDto } from './dto/product.dto';

type Disponibilidade = 'DISPONIVEL' | 'ULTIMAS_UNIDADES' | 'ESGOTADO';

/**
 * Catálogo público consumido pelo cliente final (WhatsApp → link).
 * Nunca expõe preço de compra nem quantidade exata de estoque —
 * apenas uma faixa de disponibilidade.
 */
@ApiTags('Público — Catálogo')
@Public()
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller('public/catalog')
export class PublicCatalogController {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: IProductRepository,
    @Inject(CATEGORY_REPOSITORY) private readonly categories: ICategoryRepository,
  ) {}

  @Get('products')
  @ApiOperation({ summary: 'Produtos ativos (busca, categoria, paginação)' })
  async listProducts(@Query() query: ProductQueryDto) {
    const [data, total] = await this.products.findMany({
      skip: query.skip,
      take: query.limit,
      search: query.search,
      categoriaId: query.categoriaId,
      ativo: true,
      orderBy: { nome: 'asc' },
    });
    return new PaginatedResponseDto(
      data.map((p) => this.toPublic(p)),
      total,
      query.page,
      query.limit,
    );
  }

  @Get('categories')
  @ApiOperation({ summary: 'Categorias ativas' })
  async listCategories() {
    const [data] = await this.categories.findMany({
      skip: 0,
      take: 100,
      ativo: true,
      orderBy: { nome: 'asc' },
    });
    return data.map((c) => ({ id: c.id, nome: c.nome }));
  }

  private toPublic(p: ProductWithCategoria) {
    const estoque = Number(p.estoque);
    const minimo = Number(p.estoqueMinimo);
    const disponibilidade: Disponibilidade =
      estoque <= 0 ? 'ESGOTADO' : estoque <= minimo ? 'ULTIMAS_UNIDADES' : 'DISPONIVEL';

    const precoVenda = Number(p.precoVenda);
    const promocional = p.precoPromocional ? Number(p.precoPromocional) : null;
    const emPromocao = promocional !== null && promocional < precoVenda;

    return {
      id: p.id,
      nome: p.nome,
      descricao: p.descricao,
      imagemUrl: p.imagemUrl,
      categoriaId: p.categoriaId,
      categoriaNome: p.categoria.nome,
      unidade: p.unidade,
      preco: emPromocao ? promocional : precoVenda,
      precoOriginal: emPromocao ? precoVenda : null,
      emPromocao,
      disponibilidade,
    };
  }
}
