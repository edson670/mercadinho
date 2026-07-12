import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@core/auth/roles.decorator';
import { CurrentUser, AuthUser } from '@core/auth/current-user.decorator';
import { PaginationQueryDto } from '@core/common/dto/pagination-query.dto';
import { CreateUserUseCase } from '../application/create-user.use-case';
import { ListUsersUseCase } from '../application/list-users.use-case';
import { GetUserUseCase } from '../application/get-user.use-case';
import { UpdateUserUseCase } from '../application/update-user.use-case';
import { SetUserStatusUseCase } from '../application/set-user-status.use-case';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@ApiTags('Usuários')
@ApiBearerAuth()
@Roles(Role.ADMINISTRADOR)
@Controller('users')
export class UsersController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly setStatus: SetUserStatusUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cria um usuário' })
  create(@Body() dto: CreateUserDto) {
    return this.createUser.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista usuários (paginado)' })
  list(@Query() query: PaginationQueryDto) {
    return this.listUsers.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um usuário' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.getUser.execute(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um usuário' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.updateUser.execute(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Ativa/inativa um usuário' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.setStatus.execute(id, dto.ativo, user.id);
  }
}
