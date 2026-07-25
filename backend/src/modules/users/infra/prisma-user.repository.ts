import { Injectable } from '@nestjs/common';
import { Prisma, Usuario } from '@prisma/client';
import { PrismaService } from '@core/database/prisma.service';
import {
  CreateUserData,
  FindUsersParams,
  IUserRepository,
  UpdateUserData,
} from '../domain/user.repository';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateUserData): Promise<Usuario> {
    return this.prisma.usuario.create({ data });
  }

  findById(id: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  async findMany(params: FindUsersParams): Promise<[Usuario[], number]> {
    const where: Prisma.UsuarioWhereInput = params.search
      ? {
          OR: [
            { nome: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {};

    return this.prisma.$transaction([
      this.prisma.usuario.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: params.orderBy,
      }),
      this.prisma.usuario.count({ where }),
    ]);
  }

  update(id: string, data: UpdateUserData): Promise<Usuario> {
    return this.prisma.usuario.update({ where: { id }, data });
  }

  setActive(id: string, ativo: boolean): Promise<Usuario> {
    return this.prisma.usuario.update({ where: { id }, data: { ativo } });
  }

  async setResetToken(id: string, token: string, expiraEm: Date): Promise<void> {
    await this.prisma.usuario.update({
      where: { id },
      data: { resetToken: token, resetTokenExpira: expiraEm },
    });
  }

  findByResetToken(token: string): Promise<Usuario | null> {
    return this.prisma.usuario.findFirst({ where: { resetToken: token } });
  }

  async clearResetToken(id: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id },
      data: { resetToken: null, resetTokenExpira: null },
    });
  }

  async updatePassword(id: string, senhaHash: string): Promise<void> {
    await this.prisma.usuario.update({ where: { id }, data: { senhaHash } });
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.prisma.usuario.update({ where: { id }, data: { ultimoLogin: new Date() } });
  }

  async registrarFalhaLogin(id: string, bloqueadoAte: Date | null): Promise<void> {
    await this.prisma.usuario.update({
      where: { id },
      data: { tentativasFalhas: { increment: 1 }, bloqueadoAte },
    });
  }

  async limparFalhasLogin(id: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id },
      data: { tentativasFalhas: 0, bloqueadoAte: null },
    });
  }

  async setMfaPendingSecret(id: string, secretCifrado: string): Promise<void> {
    await this.prisma.usuario.update({ where: { id }, data: { mfaSecretCifrado: secretCifrado } });
  }

  async enableMfa(id: string, recoveryCodesHash: string[]): Promise<void> {
    await this.prisma.usuario.update({
      where: { id },
      data: { mfaEnabled: true, mfaRecoveryCodesJson: JSON.stringify(recoveryCodesHash) },
    });
  }

  async disableMfa(id: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id },
      data: { mfaEnabled: false, mfaSecretCifrado: null, mfaRecoveryCodesJson: null },
    });
  }

  async consumeRecoveryCode(id: string, recoveryCodesHashRestantes: string[]): Promise<void> {
    await this.prisma.usuario.update({
      where: { id },
      data: { mfaRecoveryCodesJson: JSON.stringify(recoveryCodesHashRestantes) },
    });
  }

  async revokeSessions(id: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { usuarioId: id, revogado: false },
      data: { revogado: true },
    });
  }
}
