import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResponseDto } from '@core/common/dto/paginated-response.dto';
import { PaginationQueryDto } from '@core/common/dto/pagination-query.dto';
import { IUserRepository, USER_REPOSITORY } from '../domain/user.repository';
import { UserResponseDto } from '../presentation/dto/user-response.dto';

@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResponseDto<UserResponseDto>> {
    const [data, total] = await this.users.findMany({
      skip: query.skip,
      take: query.limit,
      search: query.search,
      orderBy: query.orderBy('criadoEm', 'desc', ['nome', 'email', 'ultimoLogin', 'criadoEm']),
    });

    return new PaginatedResponseDto(
      data.map(UserResponseDto.fromEntity),
      total,
      query.page,
      query.limit,
    );
  }
}
