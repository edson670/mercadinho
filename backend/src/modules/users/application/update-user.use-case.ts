import { Inject, Injectable } from '@nestjs/common';
import { HashingService } from '@core/security/hashing.service';
import { ConflictError, NotFoundError } from '@core/errors/domain.errors';
import { IUserRepository, USER_REPOSITORY, UpdateUserData } from '../domain/user.repository';
import { UpdateUserDto } from '../presentation/dto/update-user.dto';
import { UserResponseDto } from '../presentation/dto/user-response.dto';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly hashing: HashingService,
  ) {}

  async execute(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('Usuário', id);

    if (dto.email && dto.email !== user.email) {
      const emailEmUso = await this.users.findByEmail(dto.email);
      if (emailEmUso) throw new ConflictError('Já existe um usuário com este e-mail.');
    }

    const data: UpdateUserData = {
      nome: dto.nome,
      email: dto.email,
      role: dto.role,
    };
    if (dto.senha) {
      data.senhaHash = await this.hashing.hash(dto.senha);
    }

    const atualizado = await this.users.update(id, data);

    // Troca de senha (ou rebaixamento de perfil) precisa derrubar as sessões
    // ativas — senão o access/refresh token antigo continua carregando o papel
    // anterior até expirar.
    if (data.senhaHash || (dto.role && dto.role !== user.role)) {
      await this.users.revokeSessions(id);
    }

    return UserResponseDto.fromEntity(atualizado);
  }
}
