/**
 * Cria o usuário administrador no primeiro boot — apenas quando não existe
 * nenhum usuário. Nunca sobrescreve uma conta existente (para trocar a senha,
 * use `npm run db:seed` explicitamente).
 */
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const email = (process.env.SEED_ADMIN_EMAIL || 'admin@natastudios.com').toLowerCase();

// Nunca deixar uma senha padrão no código. Sem a variável, geramos uma forte
// e a registramos no log de boot.
const envPassword = process.env.SEED_ADMIN_PASSWORD;
const password = envPassword || randomBytes(12).toString('base64url');

try {
  const count = await prisma.user.count();
  if (count === 0) {
    await prisma.user.create({
      data: {
        email,
        name: 'Admin',
        passwordHash: await bcrypt.hash(password, 12),
        role: 'admin'
      }
    });
    console.log(`[boot] admin criado: ${email}`);
    if (!envPassword) {
      console.log(
        `[boot] SENHA GERADA: ${password}  (defina SEED_ADMIN_PASSWORD para escolher a sua)`
      );
    }
  } else {
    console.log('[boot] admin ja existe, nada a fazer');
  }
} catch (err) {
  console.error('[boot] erro ao verificar admin:', err.message);
} finally {
  await prisma.$disconnect();
}
