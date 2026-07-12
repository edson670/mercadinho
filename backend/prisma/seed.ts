import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@mercado.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123';
  const adminNome = process.env.SEED_ADMIN_NAME ?? 'Administrador';
  const empresaNome = process.env.SEED_EMPRESA_NOME ?? 'Meu Mercadinho';

  // 1) Usuário administrador
  const senhaHash = await argon2.hash(adminPassword);
  const admin = await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      nome: adminNome,
      email: adminEmail,
      senhaHash,
      role: Role.ADMINISTRADOR,
    },
  });
  console.log(`✔ Admin: ${admin.email}`);

  // 2) Configuração da empresa (registro único)
  const configExistente = await prisma.configuracao.findFirst();
  if (!configExistente) {
    await prisma.configuracao.create({ data: { nome: empresaNome } });
    console.log(`✔ Configuração da empresa criada: ${empresaNome}`);
  }

  // 3) Categorias básicas
  const categorias = ['Bebidas', 'Mercearia', 'Limpeza', 'Hortifruti', 'Padaria', 'Frios'];
  for (const nome of categorias) {
    await prisma.categoria.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
  }
  console.log(`✔ ${categorias.length} categorias garantidas`);

  console.log('\n✅ Seed concluído.');
  console.log(`   Login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
