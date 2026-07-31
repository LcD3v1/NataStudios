/**
 * Consulta o estado da conta admin e, com --unlock, remove o bloqueio por
 * tentativas excessivas.
 *
 *   node scripts/unlock-admin.mjs            # só mostra o estado
 *   node scripts/unlock-admin.mjs --unlock   # desbloqueia
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const email = (process.env.SEED_ADMIN_EMAIL || 'admin@natastudios.com').toLowerCase();

const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.error('Usuario nao encontrado:', email);
  process.exit(1);
}

const locked = user.lockedUntil ? user.lockedUntil > new Date() : false;
console.log('\nConta:', user.email);
console.log('  tentativas falhas :', user.failedAttempts);
console.log('  bloqueada ate     :', user.lockedUntil ?? '-');
console.log('  bloqueada agora   :', locked ? 'SIM' : 'nao');
console.log('  2FA ativo         :', user.totpEnabled);

if (process.argv.includes('--unlock')) {
  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null }
  });
  console.log('\n  -> conta desbloqueada\n');
}

console.log('\nRegistros no banco:');
console.log('  leads    :', await prisma.lead.count());
console.log('  clientes :', await prisma.client.count());
console.log('  projetos :', await prisma.project.count());
console.log('  posts    :', await prisma.socialPost.count());
console.log('  faturas  :', await prisma.invoice.count());
console.log('');

await prisma.$disconnect();
