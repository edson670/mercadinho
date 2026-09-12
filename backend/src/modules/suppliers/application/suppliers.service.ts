import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResponseDto } from '@core/common/dto/paginated-response.dto';
import { NotFoundError } from '@core/errors/domain.errors';
import { ISupplierRepository, SUPPLIER_REPOSITORY } from '../domain/supplier.repository';
import {
  CreateSupplierDto,
  SupplierQueryDto,
  SupplierResponseDto,
  UpdateSupplierDto,
} from '../presentation/dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(@Inject(SUPPLIER_REPOSITORY) private readonly repo: ISupplierRepository) {}

  async create(dto: CreateSupplierDto): Promise<SupplierResponseDto> {
    const fornecedor = await this.repo.create({
      nome: dto.nome,
      telefone: dto.telefone ?? null,
      endereco: dto.endereco ?? null,
      observacoes: dto.observacoes ?? null,
    });
    return SupplierResponseDto.fromEntity(fornecedor);
  }

  async list(query: SupplierQueryDto): Promise<PaginatedResponseDto<SupplierResponseDto>> {
    const [data, total] = await this.repo.findMany({
      skip: query.skip,
      take: query.limit,
      search: query.search,
      ativo: query.ativo,
      orderBy: query.orderBy('nome', 'asc', ['nome', 'criadoEm']),
    });
    return new PaginatedResponseDto(
      data.map(SupplierResponseDto.fromEntity),
      total,
      query.page,
      query.limit,
    );
  }

  async get(id: string): Promise<SupplierResponseDto> {
    const fornecedor = await this.repo.findById(id);
    if (!fornecedor) throw new NotFoundError('Fornecedor', id);
    return SupplierResponseDto.fromEntity(fornecedor);
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<SupplierResponseDto> {
    const fornecedor = await this.repo.findById(id);
    if (!fornecedor) throw new NotFoundError('Fornecedor', id);
    const atualizado = await this.repo.update(id, dto);
    return SupplierResponseDto.fromEntity(atualizado);
  }

  async setStatus(id: string, ativo: boolean): Promise<SupplierResponseDto> {
    const fornecedor = await this.repo.findById(id);
    if (!fornecedor) throw new NotFoundError('Fornecedor', id);
    const atualizado = await this.repo.setActive(id, ativo);
    return SupplierResponseDto.fromEntity(atualizado);
  }
}
