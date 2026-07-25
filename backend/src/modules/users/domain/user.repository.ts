import { Role, Usuario } from '@prisma/client';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface CreateUserData {
  nome: string;
  email: string;
  senhaHash: string;
  role: Role;
}

export interface UpdateUserData {
  nome?: string;
  email?: string;
  role?: Role;
  senhaHash?: string;
}

export interface FindUsersParams {
  skip: number;
  take: number;
  search?: string;
  orderBy: Record<string, 'asc' | 'desc'>;
}

/** Contrato de persistência de usuários (implementado na camada de infra). */
export interface IUserRepository {
  create(data: CreateUserData): Promise<Usuario>;
  findById(id: string): Promise<Usuario | null>;
  findByEmail(email: string): Promise<Usuario | null>;
  findMany(params: FindUsersParams): Promise<[Usuario[], number]>;
  update(id: string, data: UpdateUserData): Promise<Usuario>;
  setActive(id: string, ativo: boolean): Promise<Usuario>;

  // recuperação de senha
  // `token` aqui é sempre o digest (nunca o valor em claro) — ver HashingService.tokenDigest.
  setResetToken(id: string, token: string, expiraEm: Date): Promise<void>;
  findByResetToken(token: string): Promise<Usuario | null>;
  clearResetToken(id: string): Promise<void>;
  updatePassword(id: string, senhaHash: string): Promise<void>;
  touchLastLogin(id: string): Promise<void>;

  // bloqueio progressivo por conta (força bruta)
  registrarFalhaLogin(id: string, bloqueadoAte: Date | null): Promise<void>;
  limparFalhasLogin(id: string): Promise<void>;

  /**
   * Revoga todas as sessões ativas do usuário (refresh tokens).
   * Fica no repositório de usuários — e não no TokenService — porque
   * UsersModule também precisa disso ao trocar a senha, e importar AuthModule
   * aqui criaria dependência circular (AuthModule já importa UsersModule).
   */
  revokeSessions(id: string): Promise<void>;
}
