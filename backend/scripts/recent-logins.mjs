/**
 * Mostra as tentativas de login recentes registradas na auditoria.
 * Serve para saber se as requisicoes estao chegando ao servidor e com qual e-mail.
 *
 *   node scripts/recent-logins.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const logs = await prisma.auditLog.findMany({
  where: { action: { startsWith: 'login' } },
  orderBy: { createdAt: 'desc' },
  take: 15
});

if (logs.length === 0) {
  console.log('\nNenhuma tentativa de login registrada.\n');
} else {
  console.log('\nUltimas tentativas de login:\n');
  for (const l of logs) {
    const when = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium'
    }).format(l.createdAt);
    console.log(`  ${when}  ${l.action.padEnd(20)} ${l.actor ?? '-'}  ip=${l.ip ?? '-'}`);
  }
  console.log('');
}

await prisma.$disconnect();
