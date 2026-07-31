/**
 * Imprime o código TOTP atual da conta — atalho de DESENVOLVIMENTO para testes
 * locais. Em produção o código deve vir sempre do app autenticador do usuário.
 *
 *   node --experimental-strip-types scripts/totp-code.mjs
 */
import { PrismaClient } from '@prisma/client';
import { generateTotpCode } from '../src/lib/security/totp.ts';

const prisma = new PrismaClient();
const email = (process.env.SEED_ADMIN_EMAIL || 'admin@natastudios.com').toLowerCase();

const user = await prisma.user.findUnique({ where: { email } });
if (!user?.totpSecret) {
  console.error('Conta sem segredo TOTP configurado.');
  process.exit(1);
}

console.log(generateTotpCode(user.totpSecret));
await prisma.$disconnect();
