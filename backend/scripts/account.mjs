/**
 * Mostra o estado da conta e, com --unlock, remove o bloqueio por tentativas.
 *
 *   node scripts/account.mjs
 *   node scripts/account.mjs --unlock
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const email = (process.env.SEED_ADMIN_EMAIL || 'admin@natastudios.com').toLowerCase();

const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.error(`\n❌ Usuario nao encontrado: ${email}`);
  console.error('   Crie com: npm run db:seed (defina SEED_ADMIN_PASSWORD)\n');
  process.exit(1);
}

const locked = user.lockedUntil ? user.lockedUntil > new Date() : false;
console.log('\nConta:', user.email);
console.log('  nome              :', user.name);
console.log('  papel             :', user.role);
console.log('  tentativas falhas :', user.failedAttempts);
console.log('  bloqueada ate     :', user.lockedUntil ?? '-');
console.log('  BLOQUEADA AGORA   :', locked ? 'SIM' : 'nao');
console.log('  2FA ativo         :', user.totpEnabled);
console.log('  sessionVersion    :', user.sessionVersion);

if (process.argv.includes('--unlock')) {
  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null }
  });
  console.log('\n  ✅ conta desbloqueada');
}

console.log('\nRegistros:');
console.log('  leads    :', await prisma.lead.count());
console.log('  clientes :', await prisma.client.count());
console.log('  projetos :', await prisma.project.count());
console.log('  posts    :', await prisma.socialPost.count());
console.log('  faturas  :', await prisma.invoice.count());
console.log('');

await prisma.$disconnect();
