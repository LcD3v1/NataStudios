/**
 * Creates the admin user on first boot — only when no user exists yet.
 * Never overwrites an existing account (a password change is done by running
 * `prisma/seed.mjs` explicitly).
 */
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const email = (process.env.SEED_ADMIN_EMAIL || 'admin@natastudios.com').toLowerCase();

// The password comes from the environment (set it in `.env`, which is never
// committed). If it is missing we generate a strong random one and print it to
// the boot logs — never ship a hardcoded default in source control.
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
      console.log(`[boot] SENHA GERADA: ${password}  (defina SEED_ADMIN_PASSWORD no .env para escolher a sua)`);
    }
  } else {
    console.log('[boot] admin ja existe, nada a fazer');
  }
} catch (err) {
  console.error('[boot] erro ao verificar admin:', err.message);
} finally {
  await prisma.$disconnect();
}
