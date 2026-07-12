import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';

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
}
