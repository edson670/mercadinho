import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResponseDto } from '@core/common/dto/paginated-response.dto';
import { ConflictError, NotFoundError } from '@core/errors/domain.errors';
import { CUSTOMER_REPOSITORY, ICustomerRepository } from '../domain/customer.repository';
import {
  CreateCustomerDto,
  CustomerQueryDto,
  CustomerResponseDto,
  UpdateCustomerDto,
} from '../presentation/dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(@Inject(CUSTOMER_REPOSITORY) private readonly repo: ICustomerRepository) {}

  async create(dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    if (dto.cpf) {
      const existente = await this.repo.findByCpf(dto.cpf);
      if (existente) throw new ConflictError('Já existe um cliente com este CPF.');
    }
    const cliente = await this.repo.create({
      nome: dto.nome,
      cpf: dto.cpf ?? null,
      telefone: dto.telefone ?? null,
      endereco: dto.endereco ?? null,
      observacoes: dto.observacoes ?? null,
    });
    return CustomerResponseDto.fromEntity(cliente);
  }

  async list(query: CustomerQueryDto): Promise<PaginatedResponseDto<CustomerResponseDto>> {
    const [data, total] = await this.repo.findMany({
      skip: query.skip,
      take: query.limit,
      search: query.search,
      ativo: query.ativo,
      orderBy: query.orderBy('nome', 'asc') as Record<string, 'asc' | 'desc'>,
    });
    return new PaginatedResponseDto(
      data.map(CustomerResponseDto.fromEntity),
      total,
      query.page,
      query.limit,
    );
  }

  async get(id: string): Promise<CustomerResponseDto> {
    const cliente = await this.repo.findById(id);
    if (!cliente) throw new NotFoundError('Cliente', id);
    return CustomerResponseDto.fromEntity(cliente);
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    const cliente = await this.repo.findById(id);
    if (!cliente) throw new NotFoundError('Cliente', id);

    if (dto.cpf && dto.cpf !== cliente.cpf) {
      const existente = await this.repo.findByCpf(dto.cpf);
      if (existente) throw new ConflictError('Já existe um cliente com este CPF.');
    }

    const atualizado = await this.repo.update(id, dto);
    return CustomerResponseDto.fromEntity(atualizado);
  }

  async setStatus(id: string, ativo: boolean): Promise<CustomerResponseDto> {
    const cliente = await this.repo.findById(id);
    if (!cliente) throw new NotFoundError('Cliente', id);
    const atualizado = await this.repo.setActive(id, ativo);
    return CustomerResponseDto.fromEntity(atualizado);
  }
}
