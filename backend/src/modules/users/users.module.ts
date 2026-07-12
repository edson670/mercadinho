import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from './domain/user.repository';
import { PrismaUserRepository } from './infra/prisma-user.repository';
import { UsersController } from './presentation/users.controller';
import { CreateUserUseCase } from './application/create-user.use-case';
import { ListUsersUseCase } from './application/list-users.use-case';
import { GetUserUseCase } from './application/get-user.use-case';
import { UpdateUserUseCase } from './application/update-user.use-case';
import { SetUserStatusUseCase } from './application/set-user-status.use-case';

@Module({
  controllers: [UsersController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    CreateUserUseCase,
    ListUsersUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
    SetUserStatusUseCase,
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
