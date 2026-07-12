import { Inject, Injectable } from '@nestjs/common';
import { HashingService } from '@core/security/hashing.service';
import { ConflictError } from '@core/errors/domain.errors';
import { IUserRepository, USER_REPOSITORY } from '../domain/user.repository';
import { CreateUserDto } from '../presentation/dto/create-user.dto';
import { UserResponseDto } from '../presentation/dto/user-response.dto';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly hashing: HashingService,
  ) {}

  async execute(dto: CreateUserDto): Promise<UserResponseDto> {
    const existente = await this.users.findByEmail(dto.email);
    if (existente) {
      throw new ConflictError('Já existe um usuário com este e-mail.');
    }

    const senhaHash = await this.hashing.hash(dto.senha);
    const user = await this.users.create({
      nome: dto.nome,
      email: dto.email,
      senhaHash,
      role: dto.role,
    });

    return UserResponseDto.fromEntity(user);
  }
}
