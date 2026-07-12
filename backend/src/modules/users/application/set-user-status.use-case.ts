import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError, BusinessRuleError } from '@core/errors/domain.errors';
import { IUserRepository, USER_REPOSITORY } from '../domain/user.repository';
import { UserResponseDto } from '../presentation/dto/user-response.dto';

@Injectable()
export class SetUserStatusUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}

  async execute(id: string, ativo: boolean, solicitanteId: string): Promise<UserResponseDto> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('Usuário', id);

    if (!ativo && id === solicitanteId) {
      throw new BusinessRuleError('Você não pode inativar o próprio usuário.');
    }

    const atualizado = await this.users.setActive(id, ativo);
    return UserResponseDto.fromEntity(atualizado);
  }
}
