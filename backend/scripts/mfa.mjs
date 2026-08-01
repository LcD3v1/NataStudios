/**
 * Gerencia o 2FA da conta pela linha de comando — use quando perder o acesso
 * ao aplicativo autenticador.
 *
 *   node scripts/mfa.mjs --disable    desativa o 2FA (login volta a ser so senha)
 *   node scripts/mfa.mjs --status     mostra a situacao atual
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const email = (process.env.SEED_ADMIN_EMAIL || 'admin@natastudios.com').toLowerCase();

const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.error(`Usuario nao encontrado: ${email}`);
  process.exit(1);
}

if (process.argv.includes('--disable')) {
  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null, failedAttempts: 0, lockedUntil: null }
  });
  await prisma.auditLog.create({
    data: { action: 'mfa_disabled', actor: user.email, meta: JSON.stringify({ via: 'cli' }) }
  });
  console.log(`\n✅ 2FA desativado para ${user.email}`);
  console.log('   O login agora pede apenas e-mail e senha.');
  console.log('   Reative em /dashboard/seguranca quando tiver o app pronto.\n');
} else {
  console.log(`\nConta : ${user.email}`);
  console.log(`2FA   : ${user.totpEnabled ? 'ATIVO' : 'desativado'}`);
  if (user.totpEnabled) {
    console.log('\nPerdeu o acesso ao app? Rode: node scripts/mfa.mjs --disable\n');
  } else {
    console.log('');
  }
}

await prisma.$disconnect();
