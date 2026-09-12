import { Prisma } from '@prisma/client';

/** 40001 = serialization_failure. O Postgres pede que a transação recomece. */
const SERIALIZATION_FAILURE = '40001';
const TENTATIVAS_PADRAO = 3;

function ehFalhaDeSerializacao(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    (err.code === 'P2034' || (err.meta?.code as string | undefined) === SERIALIZATION_FAILURE)
  );
}

/**
 * Reexecuta uma transação Serializable quando o Postgres a aborta por
 * conflito. Esse erro não significa que a operação é inválida — significa
 * "duas transações se cruzaram, tente de novo" — mas sem o retry ele subia
 * como erro genérico e o cliente via o pedido falhar sem motivo aparente.
 *
 * Só tem sentido para blocos idempotentes: a transação abortada não deixa
 * nada gravado, então repetir do zero é seguro.
 */
export async function comRetrySerializacao<T>(
  executar: () => Promise<T>,
  tentativas = TENTATIVAS_PADRAO,
): Promise<T> {
  let ultimoErro: unknown;

  for (let i = 0; i < tentativas; i++) {
    try {
      return await executar();
    } catch (err) {
      if (!ehFalhaDeSerializacao(err)) throw err;
      ultimoErro = err;
      // Espera crescente com jitter: reexecutar as duas na mesma hora faria
      // elas colidirem de novo.
      await new Promise((r) => setTimeout(r, 25 * 2 ** i + Math.random() * 25));
    }
  }

  throw ultimoErro;
}
