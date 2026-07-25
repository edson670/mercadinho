export type Role = 'ADMINISTRADOR' | 'GERENTE' | 'CAIXA';

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  // O refresh token não trafega mais no corpo — vai em cookie HttpOnly.
  accessToken: string;
  user: AuthUser;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
