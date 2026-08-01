/**
 * Redefine a senha de um usuário — recuperação por linha de comando.
 *
 *   node scripts/reset-password.mjs "nova-senha"
 *   node scripts/reset-password.mjs "nova-senha" outro@email.com
 *
 * Também encerra todas as sessões abertas e desbloqueia a conta.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const password = process.argv[2];
const email = (process.argv[3] || process.env.SEED_ADMIN_EMAIL || 'admin@natastudios.com')
  .trim()
  .toLowerCase();

if (!password || password.length < 8) {
  console.error('\nUso: node scripts/reset-password.mjs "nova-senha" [email]');
  console.error('     (minimo 8 caracteres)\n');
  process.exit(1);
}

const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.error(`\nUsuario nao encontrado: ${email}`);
  const all = await prisma.user.findMany({ select: { email: true } });
  if (all.length) console.error('Existentes: ' + all.map((u) => u.email).join(', ') + '\n');
  else console.error('Nenhum usuario cadastrado — abra /dashboard para criar o administrador.\n');
  process.exit(1);
}

await prisma.user.update({
  where: { id: user.id },
  data: {
    passwordHash: await bcrypt.hash(password, 12),
    failedAttempts: 0,
    lockedUntil: null,
    // Invalida as sessoes abertas em outros dispositivos.
    sessionVersion: { increment: 1 }
  }
});

console.log(`\n✅ Senha redefinida para ${user.email}`);
console.log('   Conta desbloqueada e sessoes anteriores encerradas.\n');

await prisma.$disconnect();
