import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '@core/errors/domain.errors';
import { IUserRepository, USER_REPOSITORY } from '../domain/user.repository';
import { UserResponseDto } from '../presentation/dto/user-response.dto';

@Injectable()
export class GetUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}

  async execute(id: string): Promise<UserResponseDto> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('Usuário', id);
    return UserResponseDto.fromEntity(user);
  }
}
