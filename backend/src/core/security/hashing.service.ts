import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';

/** Abstração de hashing de senhas e geração de tokens seguros. */
@Injectable()
export class HashingService {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return argon2.verify(hashed, plain);
  }

  /** Token aleatório opaco (ex.: recuperação de senha). */
  randomToken(bytes = 32): string {
    return randomBytes(bytes).toString('hex');
  }

  /**
   * Hash determinístico para guardar tokens no banco sem perder a busca por
   * igualdade. Argon2 não serve aqui: cada chamada gera um salt diferente, o
   * que impede o `findUnique`. SHA-256 puro é adequado porque a entrada já é
   * aleatória e de alta entropia (256 bits) — não há dicionário a atacar,
   * diferente do caso de senhas escolhidas por humanos.
   */
  tokenDigest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
