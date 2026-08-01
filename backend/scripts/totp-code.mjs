/**
 * Imprime o código TOTP atual da conta — atalho de DESENVOLVIMENTO.
 * Em produção o código deve sempre vir do app autenticador do usuário.
 *
 *   node scripts/totp-code.mjs
 */
import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(secret) {
  let bits = '';
  for (const c of secret.toUpperCase()) bits += B32.indexOf(c).toString(2).padStart(5, '0');
  const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}

const prisma = new PrismaClient();
const email = (process.env.SEED_ADMIN_EMAIL || 'admin@natastudios.com').toLowerCase();
const user = await prisma.user.findUnique({ where: { email } });

if (!user?.totpSecret) {
  console.error('Conta sem segredo TOTP configurado.');
  process.exit(1);
}

const buf = Buffer.alloc(8);
buf.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)));
const digest = createHmac('sha1', base32Decode(user.totpSecret)).update(buf).digest();
const offset = digest[digest.length - 1] & 0x0f;
const binary =
  ((digest[offset] & 0x7f) << 24) |
  ((digest[offset + 1] & 0xff) << 16) |
  ((digest[offset + 2] & 0xff) << 8) |
  (digest[offset + 3] & 0xff);

console.log((binary % 1000000).toString().padStart(6, '0'));
await prisma.$disconnect();
