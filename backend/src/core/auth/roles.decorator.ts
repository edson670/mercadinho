import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Declara os perfis autorizados para uma rota.
 * Ex.: @Roles(Role.ADMINISTRADOR, Role.GERENTE)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
