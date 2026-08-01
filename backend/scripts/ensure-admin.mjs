/**
 * Cria o administrador no boot APENAS quando as variáveis
 * SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD foram definidas explicitamente.
 *
 * Sem elas, não criamos nada: o banco fica sem usuários e a aplicação mostra a
 * tela de primeiro acesso em /dashboard/login, onde o administrador é criado
 * com a senha escolhida na hora. É melhor que gerar uma senha aleatória e
 * escondê-la no log de boot.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;

try {
  const count = await prisma.user.count();

  if (count > 0) {
    console.log('[boot] usuario ja existe, nada a fazer');
  } else if (email && password) {
    await prisma.user.create({
      data: {
        email,
        name: 'Admin',
        passwordHash: await bcrypt.hash(password, 12),
        role: 'admin'
      }
    });
    console.log(`[boot] admin criado a partir das variaveis de ambiente: ${email}`);
  } else {
    console.log('[boot] nenhum usuario cadastrado — abra /dashboard para criar o administrador');
  }
} catch (err) {
  console.error('[boot] erro ao verificar admin:', err.message);
} finally {
  await prisma.$disconnect();
}
