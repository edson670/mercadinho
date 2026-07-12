/**
 * Erros de domínio — independentes de HTTP/framework.
 * O AllExceptionsFilter mapeia cada um para o status HTTP adequado.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** Recurso não encontrado → 404 */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  constructor(entidade: string, id?: string) {
    super(id ? `${entidade} não encontrado(a): ${id}` : `${entidade} não encontrado(a)`);
  }
}

/** Violação de regra de negócio → 409 */
export class BusinessRuleError extends DomainError {
  readonly code = 'BUSINESS_RULE';
  constructor(message: string) {
    super(message);
  }
}

/** Conflito de unicidade → 409 */
export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
  constructor(message: string) {
    super(message);
  }
}

/** Entrada inválida por regra de domínio → 400 */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION';
  constructor(message: string) {
    super(message);
  }
}

/** Acesso negado por regra de negócio → 403 */
export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
  constructor(message: string) {
    super(message);
  }
}

// Erros específicos reutilizados entre módulos
export class EstoqueInsuficienteError extends BusinessRuleError {
  constructor(produto: string) {
    super(`Estoque insuficiente para o produto: ${produto}`);
  }
}

export class CaixaFechadoError extends BusinessRuleError {
  constructor() {
    super('Nenhum caixa aberto. Abra o caixa antes de registrar vendas.');
  }
}
