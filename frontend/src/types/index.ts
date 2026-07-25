export type Role = 'ADMINISTRADOR' | 'GERENTE' | 'CAIXA';

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  role: Role;
  mfaEnabled: boolean;
}

export interface LoginSuccess {
  mfaRequired: false;
  // O refresh token não trafega mais no corpo — vai em cookie HttpOnly.
  accessToken: string;
  user: AuthUser;
  /** Perfil sem MFA ativo em conta que deveria ter (ADMINISTRADOR/GERENTE). */
  mfaSetupRecommended: boolean;
}

export interface LoginMfaRequired {
  mfaRequired: true;
  /** Token curto — só serve para chamar POST /auth/mfa/verify. */
  mfaToken: string;
}

export type LoginResponse = LoginSuccess | LoginMfaRequired;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
