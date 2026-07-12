import { ApiProperty } from '@nestjs/swagger';
import { Role, Usuario } from '@prisma/client';

/** Representação segura de um usuário (sem senhaHash / tokens). */
export class UserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: Role }) role!: Role;
  @ApiProperty() ativo!: boolean;
  @ApiProperty({ nullable: true }) ultimoLogin!: Date | null;
  @ApiProperty() criadoEm!: Date;

  static fromEntity(u: Usuario): UserResponseDto {
    return {
      id: u.id,
      nome: u.nome,
      email: u.email,
      role: u.role,
      ativo: u.ativo,
      ultimoLogin: u.ultimoLogin,
      criadoEm: u.criadoEm,
    };
  }
}
