/**
 * Testes de segurança — rodam com o test runner nativo do Node (sem dependências).
 *
 *   npm run test:security
 *
 * Cobrem as unidades puras (TOTP, rate limit, validação, escaping). Os testes de
 * ponta a ponta contra o servidor rodando ficam em tests/security-e2e.mjs.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateTotpSecret,
  generateTotpCode,
  verifyTotp,
  buildOtpAuthUri
} from '../src/lib/security/totp.ts';
import { rateLimit, rateLimitReset } from '../src/lib/security/rate-limit.ts';
import { isSameOrigin, getClientIp } from '../src/lib/security/http.ts';
import { escapeHtml } from '../src/lib/email.ts';
import {
  contactSchema,
  loginSchema,
  invoiceCreateSchema,
  projectMoveSchema
} from '../src/lib/validation.ts';

describe('TOTP (MFA)', () => {
  test('gera segredo base32 de 32 caracteres', () => {
    const s = generateTotpSecret();
    assert.match(s, /^[A-Z2-7]{32}$/);
  });

  test('aceita o código correto', () => {
    const s = generateTotpSecret();
    assert.equal(verifyTotp(s, generateTotpCode(s)), true);
  });

  test('rejeita código errado', () => {
    const s = generateTotpSecret();
    const wrong = generateTotpCode(s) === '000000' ? '111111' : '000000';
    assert.equal(verifyTotp(s, wrong), false);
  });

  test('rejeita formatos inválidos sem lançar exceção', () => {
    const s = generateTotpSecret();
    for (const bad of ['', 'abc', '12345', '1234567', '<script>', '../../etc/passwd']) {
      assert.equal(verifyTotp(s, bad), false);
    }
  });

  test('tolera desvio de relógio de ±30s', () => {
    const s = generateTotpSecret();
    const now = Date.now();
    assert.equal(verifyTotp(s, generateTotpCode(s, now - 30_000), now), true);
    assert.equal(verifyTotp(s, generateTotpCode(s, now + 30_000), now), true);
  });

  test('rejeita código de janela distante (replay antigo)', () => {
    const s = generateTotpSecret();
    const now = Date.now();
    assert.equal(verifyTotp(s, generateTotpCode(s, now - 300_000), now), false);
  });

  test('URI otpauth bem formada', () => {
    const s = generateTotpSecret();
    const uri = buildOtpAuthUri(s, 'admin@natastudios.com');
    assert.ok(uri.startsWith('otpauth://totp/'));
    assert.ok(uri.includes(`secret=${s}`));
  });
});

describe('Rate limiting (anti brute-force)', () => {
  test('bloqueia após exceder o limite', () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) assert.equal(rateLimit(key, 3, 60_000).ok, true);
    const blocked = rateLimit(key, 3, 60_000);
    assert.equal(blocked.ok, false);
    assert.ok(blocked.retryAfterSeconds > 0);
  });

  test('reset libera novamente (login bem-sucedido)', () => {
    const key = `test:${Math.random()}`;
    rateLimit(key, 1, 60_000);
    assert.equal(rateLimit(key, 1, 60_000).ok, false);
    rateLimitReset(key);
    assert.equal(rateLimit(key, 1, 60_000).ok, true);
  });

  test('chaves diferentes não interferem entre si', () => {
    const a = `test:${Math.random()}`;
    const b = `test:${Math.random()}`;
    rateLimit(a, 1, 60_000);
    rateLimit(a, 1, 60_000);
    assert.equal(rateLimit(b, 1, 60_000).ok, true);
  });
});

describe('CSRF (verificação de origem)', () => {
  const req = (headers) => new Request('https://natastudios.com/api/x', { headers });

  test('aceita mesma origem', () => {
    assert.equal(
      isSameOrigin(req({ host: 'natastudios.com', origin: 'https://natastudios.com' })),
      true
    );
  });

  test('rejeita origem externa', () => {
    assert.equal(
      isSameOrigin(req({ host: 'natastudios.com', origin: 'https://evil.com' })),
      false
    );
  });

  test('rejeita requisição sem Origin nem Referer', () => {
    assert.equal(isSameOrigin(req({ host: 'natastudios.com' })), false);
  });

  test('rejeita subdomínio parecido (typosquatting)', () => {
    assert.equal(
      isSameOrigin(req({ host: 'natastudios.com', origin: 'https://natastudios.com.evil.com' })),
      false
    );
  });
});

describe('IP do cliente', () => {
  const req = (headers) => new Request('https://x.com/', { headers });

  test('usa o primeiro IP de x-forwarded-for', () => {
    assert.equal(getClientIp(req({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })), '1.2.3.4');
  });

  test('cai para unknown quando não há cabeçalho', () => {
    assert.equal(getClientIp(req({})), 'unknown');
  });
});

describe('Escaping (XSS em e-mails)', () => {
  test('neutraliza tags e atributos', () => {
    const out = escapeHtml('<script>alert("xss")</script>');
    assert.ok(!out.includes('<script>'));
    assert.ok(out.includes('&lt;script&gt;'));
  });

  test('escapa aspas e ampersand', () => {
    assert.equal(escapeHtml(`&"'<>`), '&amp;&quot;&#39;&lt;&gt;');
  });
});

describe('Validação de entrada', () => {
  test('contato rejeita e-mail inválido', () => {
    const r = contactSchema.safeParse({
      name: 'Fulano',
      email: 'nao-e-email',
      message: 'mensagem suficientemente longa'
    });
    assert.equal(r.success, false);
  });

  test('contato rejeita campos gigantes (DoS)', () => {
    const r = contactSchema.safeParse({
      name: 'a'.repeat(5000),
      email: 'a@b.com',
      message: 'mensagem suficientemente longa'
    });
    assert.equal(r.success, false);
  });

  test('honeypot preenchido é rejeitado pelo schema', () => {
    const r = contactSchema.safeParse({
      name: 'Fulano',
      email: 'a@b.com',
      message: 'mensagem suficientemente longa',
      company: 'bot preencheu'
    });
    assert.equal(r.success, false);
  });

  test('login normaliza e-mail para minúsculas', () => {
    const r = loginSchema.safeParse({ email: '  ADMIN@X.COM ', password: 'x' });
    assert.equal(r.success, true);
    assert.equal(r.data.email, 'admin@x.com');
  });

  test('fatura rejeita valor não numérico', () => {
    const r = invoiceCreateSchema.safeParse({ description: 'x', amount: 'abc' });
    assert.equal(r.success, false);
  });

  test('fatura aceita formato pt-BR', () => {
    const r = invoiceCreateSchema.safeParse({ description: 'x', amount: '1.234,56' });
    assert.equal(r.success, true);
    assert.equal(r.data.amount, 1234.56);
  });

  test('data inválida é rejeitada (evita 500)', () => {
    const r = invoiceCreateSchema.safeParse({
      description: 'x',
      amount: '10',
      dueDate: 'not-a-date'
    });
    assert.equal(r.success, false);
  });

  test('status fora da lista cai no padrão seguro', () => {
    const r = invoiceCreateSchema.safeParse({
      description: 'x',
      amount: '10',
      status: 'superadmin'
    });
    assert.equal(r.success, true);
    assert.equal(r.data.status, 'draft');
  });

  test('id de projeto rejeita injeção de caracteres', () => {
    for (const bad of ["' OR 1=1--", '../../etc', '<script>', 'a b']) {
      assert.equal(projectMoveSchema.safeParse({ id: bad, status: 'done' }).success, false);
    }
  });

  test('status de projeto fora da lista é rejeitado', () => {
    assert.equal(
      projectMoveSchema.safeParse({ id: 'abc123', status: 'deleted' }).success,
      false
    );
  });
});
