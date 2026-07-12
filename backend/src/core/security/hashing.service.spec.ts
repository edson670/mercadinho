import { HashingService } from './hashing.service';

describe('HashingService', () => {
  const service = new HashingService();

  it('gera um hash diferente da senha original', async () => {
    const hash = await service.hash('Senha@123');
    expect(hash).not.toEqual('Senha@123');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('confirma a senha correta e rejeita a incorreta', async () => {
    const hash = await service.hash('Senha@123');

    await expect(service.compare('Senha@123', hash)).resolves.toBe(true);
    await expect(service.compare('SenhaErrada', hash)).resolves.toBe(false);
  });

  it('gera tokens aleatórios únicos e com o tamanho esperado', () => {
    const t1 = service.randomToken();
    const t2 = service.randomToken();

    expect(t1).not.toEqual(t2);
    expect(t1).toHaveLength(64); // 32 bytes em hexadecimal
    expect(/^[0-9a-f]+$/.test(t1)).toBe(true);
  });
});
