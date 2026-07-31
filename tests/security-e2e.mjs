/**
 * Testes de segurança de ponta a ponta contra um servidor rodando.
 *
 *   1) npm run dev            (em outro terminal)
 *   2) npm run test:e2e
 *
 * Verifica autenticação, MFA, CSRF, rate limiting, lockout de conta,
 * headers de segurança e proteção de rotas.
 *
 * Use BASE_URL para apontar para outro ambiente (ex.: staging via HTTPS).
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateTotpSecret, generateTotpCode } from '../src/lib/security/totp.ts';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ORIGIN = new URL(BASE).origin;
const EMAIL = process.env.E2E_EMAIL || 'e2e-test@natastudios.local';
const PASSWORD = 'e2e-Senha-Forte-123!';

const prisma = new PrismaClient();
let pass = 0;
let fail = 0;

function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  ✔ ${name}`);
  } else {
    fail++;
    console.log(`  ✘ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function login(body, extraHeaders = {}) {
  return fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...extraHeaders },
    body: JSON.stringify(body)
  });
}

async function resetUser(data = {}) {
  await prisma.user.upsert({
    where: { email: EMAIL },
    update: { failedAttempts: 0, lockedUntil: null, totpEnabled: false, totpSecret: null, ...data },
    create: {
      email: EMAIL,
      name: 'E2E',
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      role: 'admin',
      ...data
    }
  });
}

async function main() {
  console.log(`\nTestes E2E de segurança — ${BASE}\n`);

  // ---------- Headers ----------
  console.log('Headers de segurança');
  const home = await fetch(BASE);
  for (const h of [
    'content-security-policy',
    'strict-transport-security',
    'x-frame-options',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy'
  ]) {
    check(`${h} presente`, home.headers.has(h));
  }
  check('X-Powered-By removido', !home.headers.has('x-powered-by'));

  // ---------- Proteção de rotas ----------
  console.log('\nProteção de rotas');
  const noAuth = await fetch(`${BASE}/dashboard`, { redirect: 'manual' });
  check(
    '/dashboard sem sessão redireciona para o login',
    noAuth.status === 307 || noAuth.status === 302,
    `status ${noAuth.status}`
  );

  // ---------- CSRF ----------
  console.log('\nCSRF');
  const noOrigin = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  check('login sem Origin é bloqueado (403)', noOrigin.status === 403, `status ${noOrigin.status}`);

  const evilOrigin = await login(
    { email: EMAIL, password: PASSWORD },
    { Origin: 'https://evil.example' }
  );
  check('login com Origin externa é bloqueado (403)', evilOrigin.status === 403);

  // ---------- Autenticação ----------
  console.log('\nAutenticação');
  await resetUser();

  const wrong = await login({ email: EMAIL, password: 'senha-errada' });
  check('senha errada rejeitada (401)', wrong.status === 401);

  const good = await login({ email: EMAIL, password: PASSWORD });
  check('senha correta aceita (200)', good.status === 200);
  const cookie = good.headers.get('set-cookie') ?? '';
  check('cookie httpOnly', /httponly/i.test(cookie));
  check('cookie SameSite', /samesite/i.test(cookie));

  // ---------- Enumeração de usuário ----------
  console.log('\nAnti-enumeração');
  await resetUser();
  const unknown = await login({ email: 'nao-existe@natastudios.local', password: 'x' });
  check('conta inexistente devolve o mesmo 401', unknown.status === 401);

  // ---------- MFA ----------
  console.log('\nMFA (2FA)');
  const secret = generateTotpSecret();
  await resetUser({ totpSecret: secret, totpEnabled: true });

  const noCode = await login({ email: EMAIL, password: PASSWORD });
  const noCodeBody = await noCode.json().catch(() => ({}));
  check('senha correta sem código exige MFA', noCodeBody.error === 'mfa_required');

  const badCode = await login({ email: EMAIL, password: PASSWORD, totp: '000000' });
  check('código inválido rejeitado', badCode.status === 401);

  await resetUser({ totpSecret: secret, totpEnabled: true });
  const okCode = await login({
    email: EMAIL,
    password: PASSWORD,
    totp: generateTotpCode(secret)
  });
  check('código válido autentica (200)', okCode.status === 200, `status ${okCode.status}`);

  // ---------- Lockout de conta ----------
  console.log('\nLockout de conta (brute-force distribuído)');
  await resetUser();
  let locked = false;
  for (let i = 0; i < 10; i++) {
    // X-Forwarded-For diferente a cada tentativa simula IPs distintos,
    // provando que o bloqueio por conta funciona independente do rate limit por IP.
    const res = await login(
      { email: EMAIL, password: 'errada' },
      { 'X-Forwarded-For': `10.0.0.${i + 1}` }
    );
    if (res.status === 423) {
      locked = true;
      break;
    }
  }
  check('conta bloqueia após tentativas repetidas (423)', locked);

  const stillLocked = await login(
    { email: EMAIL, password: PASSWORD },
    { 'X-Forwarded-For': '10.0.0.99' }
  );
  check('senha correta é recusada enquanto bloqueada', stillLocked.status === 423);

  // ---------- Rate limit por IP ----------
  console.log('\nRate limit por IP');
  await resetUser();
  let got429 = false;
  for (let i = 0; i < 12; i++) {
    const res = await login(
      { email: `x${i}@natastudios.local`, password: 'errada' },
      { 'X-Forwarded-For': '203.0.113.7' }
    );
    if (res.status === 429) {
      got429 = true;
      break;
    }
  }
  check('mesmo IP recebe 429 após o limite', got429);

  // limpeza
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.$disconnect();

  console.log(`\n${pass} passaram, ${fail} falharam\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error('\nErro ao executar os testes:', err.message);
  await prisma.$disconnect();
  process.exit(1);
});
