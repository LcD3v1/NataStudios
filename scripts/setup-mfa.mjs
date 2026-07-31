/**
 * Prepara o 2FA para um usuário: gera o segredo TOTP e o deixa pendente de
 * confirmação (o usuário confirma digitando um código em /dashboard/seguranca).
 *
 *   SEED_ADMIN_EMAIL=voce@exemplo.com node scripts/setup-mfa.mjs
 *
 * Deixar pendente (em vez de já ativar) é proposital: garante que o app do
 * usuário está funcionando antes de exigir o código no login, evitando lockout.
 */
import { PrismaClient } from '@prisma/client';
import { generateTotpSecret, buildOtpAuthUri, generateTotpCode } from '../src/lib/security/totp.ts';

const prisma = new PrismaClient();
const email = (process.env.SEED_ADMIN_EMAIL || 'admin@natastudios.com').toLowerCase();

const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.error(`Usuario nao encontrado: ${email}`);
  process.exit(1);
}

const secret = generateTotpSecret();
await prisma.user.update({
  where: { id: user.id },
  data: { totpSecret: secret, totpEnabled: false }
});

console.log('\n════════════════════════════════════════════════════════');
console.log('  2FA preparado para:', email);
console.log('════════════════════════════════════════════════════════\n');
console.log('  CHAVE (digite no app autenticador):\n');
console.log('     ' + secret.match(/.{1,4}/g).join(' '));
console.log('\n  Ou use este link/QR (otpauth):\n');
console.log('     ' + buildOtpAuthUri(secret, email));
console.log('\n  Codigo valido AGORA (so para conferir que funciona): ' + generateTotpCode(secret));
console.log('\n  Proximo passo: entre em /dashboard/seguranca e digite o');
console.log('  codigo de 6 digitos do seu app para ATIVAR o 2FA.\n');

await prisma.$disconnect();
