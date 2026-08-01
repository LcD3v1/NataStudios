/**
 * Testa se uma senha confere com o hash guardado — diagnostico de login.
 *
 *   node scripts/check-password.mjs "senha-para-testar"
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const email = (process.env.SEED_ADMIN_EMAIL || 'admin@natastudios.com').toLowerCase();
const candidates = process.argv.slice(2);

const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.error('Usuario nao encontrado:', email);
  process.exit(1);
}

console.log('\nConta       :', user.email);
console.log('2FA         :', user.totpEnabled ? 'ATIVO' : 'desativado');
console.log('bloqueada   :', user.lockedUntil && user.lockedUntil > new Date() ? 'SIM' : 'nao');
console.log('tentativas  :', user.failedAttempts);
console.log('');

if (candidates.length === 0) {
  console.log('Passe senhas para testar. Ex.: node scripts/check-password.mjs "minhaSenha"');
} else {
  for (const pwd of candidates) {
    const ok = await bcrypt.compare(pwd, user.passwordHash);
    console.log(`  ${ok ? '✅' : '❌'}  "${pwd}"`);
  }
}
console.log('');

await prisma.$disconnect();
