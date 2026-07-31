# Segurança — NATA STUDIOS

Documento de referência de segurança da aplicação. Cobre o que está **implementado no código**, o que depende de **infraestrutura/deploy**, e os **runbooks** de manutenção e resposta a incidentes.

> Princípio geral: **defesa em profundidade** + **menor privilégio** + **Zero Trust** (nada é confiável por padrão; toda requisição é validada e autenticada).

---

## 1. Controles implementados (no código)

### Autenticação & sessão
- Login por credenciais com **hash bcrypt (cost 12)** — nunca armazenamos senha em texto.
- Sessão via **JWT assinado (HS256, `jose`)** em cookie **`httpOnly`, `sameSite=lax`, `secure` em produção**, expiração de **7 dias**.
- `AUTH_SECRET` validado no boot (mínimo 32 caracteres) — falha explícita se fraco/ausente.
- **Middleware** protege todo `/dashboard` (redireciona para login se o cookie for inválido/ausente).
- **Proteção contra brute-force**: rate limit de **5 tentativas / 15 min por IP** no login, com resposta `429` + `Retry-After`.
- **Anti-enumeração de usuário**: o login sempre executa um `bcrypt.compare` (contra um hash dummy quando o e-mail não existe), evitando vazamento por *timing*.
- **RBAC**: a página de Auditoria exige `role === 'admin'` (menor privilégio).

### Proteção das rotas / API
- **CSRF (defense-in-depth)**: todas as rotas `POST` (`/api/auth/login`, `/api/auth/logout`, `/api/contact`, `/api/newsletter`) exigem `Origin`/`Referer` do mesmo host — requisições cross-site forjadas recebem `403`. Server Actions já são protegidas por Origin pelo Next.
- **Validação rigorosa de entrada** com **Zod** em todos os endpoints (formato de e-mail, limites de tamanho, etc.).
- **Rate limit** também em `/api/contact` e `/api/newsletter` (5 / 10 min por IP) + **honeypot** anti-bot.
- **Injeção de SQL/NoSQL**: mitigada por **Prisma** (queries parametrizadas; nunca concatenamos SQL). Não há `queryRaw` com input do usuário.
- **XSS**: React escapa por padrão; **nenhum** `dangerouslySetInnerHTML` com dados do usuário. E-mails gerados usam `escapeHtml()`.
- **Command Injection / Path Traversal / RCE**: não há `exec`, `eval`, leitura de arquivo por caminho vindo do usuário, nem desserialização insegura.

### Headers HTTP (em `next.config.mjs`)
- **Content-Security-Policy** (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `connect-src 'self'`, …).
- **HSTS** (`max-age=2 anos; includeSubDomains; preload`).
- **X-Frame-Options: DENY**, **X-Content-Type-Options: nosniff**, **Referrer-Policy**, **Permissions-Policy** (câmera/mic/geo desativados), **COOP/CORP**.
- **`X-Powered-By` removido** (`poweredByHeader: false`).

### Auditoria & logs
- Modelo `AuditLog` registra: `login_success`, `login_failed`, `login_rate_limited`, `logout`, e todas as ações administrativas (`create_client`, `create_project`, `move_project`, `create_post`, `create_invoice`), com **ator, IP e timestamp**.
- Página **`/dashboard/auditoria`** (admin) para consultar os últimos 200 eventos.

### Gestão de segredos
- `.env` / `.env.local` **fora do git** (`.gitignore`), com `.env.example` documentando cada variável.
- **Banco (`*.db`), logs, chaves (`*.pem/*.key`), backups** todos ignorados pelo git.
- `AUTH_SECRET` gerado com CSPRNG.

### Dependências
- `npm audit` → **0 vulnerabilidades** (sharp e postcss forçados para versões corrigidas via `overrides`).

---

## 2. Mapeamento OWASP Top 10 (2021)

| Risco | Mitigação |
| --- | --- |
| A01 Broken Access Control | Middleware + checagem de sessão em toda página do painel; RBAC na auditoria |
| A02 Cryptographic Failures | bcrypt(12); JWT HS256; cookies `httpOnly/secure`; HSTS |
| A03 Injection | Prisma parametrizado; Zod; sem `eval/exec`; escape em e-mails |
| A04 Insecure Design | Rate limit, honeypot, menor privilégio, auditoria |
| A05 Security Misconfiguration | CSP + headers; `X-Powered-By` off; segredos fora do git |
| A06 Vulnerable Components | `npm audit` 0; `overrides` para sharp/postcss |
| A07 Auth Failures | Anti-brute-force, anti-enumeração, sessão expirável |
| A08 Data Integrity Failures | Validação de entrada; CSRF origin-check |
| A09 Logging Failures | `AuditLog` de login e ações admin |
| A10 SSRF | App não faz fetch de URLs controladas pelo usuário |

---

## 3. Checklist de deploy seguro (infraestrutura)

> Estes itens **não vivem no código** — configure na hospedagem (Vercel, VPS, etc.).

- [ ] **HTTPS/TLS obrigatório** (TLS 1.2+; redirect 80→443). Em Vercel é automático; em VPS use Caddy/nginx + Let's Encrypt.
- [ ] **Banco gerenciado (Postgres/Supabase)** em vez de SQLite: usuário da app com **menor privilégio** (só CRUD nas tabelas da app, sem DDL/superuser), **SSL obrigatório** (`sslmode=require`), **criptografia em repouso** (padrão em Supabase/RDS).
- [ ] **Backups automáticos** do banco (diário) + teste de restauração.
- [ ] **WAF + DDoS** (Cloudflare / Vercel) na frente do app.
- [ ] **Rate limit distribuído** (Redis/Upstash) se rodar em múltiplas instâncias/serverless — trocar `src/lib/security/rate-limit.ts`.
- [ ] **Firewall**: expor só 443; banco em rede privada (sem IP público).
- [ ] **Monitoramento & alertas**: Sentry (erros), logs centralizados, alerta em pico de `login_failed`/`login_rate_limited`.
- [ ] **Segredos** em cofre da plataforma (Vercel Env / Doppler / Vault), **rotacionados** periodicamente. `AUTH_SECRET` novo por ambiente.
- [ ] **Trocar a senha do admin** seed (`nata2026`) e o e-mail padrão.

---

## 4. Próximas melhorias recomendadas

1. **MFA/2FA (TOTP)** para o painel — maior ganho de segurança de auth. (lib `otplib` + tela de enrolamento).
2. **CSP com nonce por requisição** (via middleware) para remover `'unsafe-inline'` de scripts.
3. **Gestão de usuários + papéis** (hoje há 1 admin seed; adicionar convite, revogação, papéis `member`).
4. **Expiração/rotação de sessão** mais curta + refresh; revogação de sessão (lista de tokens).
5. **Bloqueio por conta** (não só por IP) e CAPTCHA após N falhas.
6. **Testes de segurança automatizados** no CI (`npm audit`, `eslint-plugin-security`, SAST/Dependabot, ZAP baseline).

---

## 5. Runbook — manutenção

- **Atualizar dependências**: `npm outdated` → atualizar → `npm audit` deve ficar em 0 → testar `npm run build`.
- **Rotacionar `AUTH_SECRET`**: gerar novo (`openssl rand -base64 48`), atualizar no cofre, **redeploy** (invalida todas as sessões — comportamento esperado).
- **Resetar senha do admin**: `SEED_ADMIN_PASSWORD=nova npm run db:seed` (ou tela de usuários quando existir).

## 6. Runbook — resposta a incidente

1. **Conter**: rotacionar `AUTH_SECRET` (derruba todas as sessões) e as chaves (Resend, DB).
2. **Investigar**: consultar `/dashboard/auditoria` e os logs (picos de `login_failed`, IPs suspeitos).
3. **Erradicar**: trocar senhas comprometidas; se o banco vazou, forçar reset de credenciais.
4. **Recuperar**: restaurar do último backup íntegro; validar integridade.
5. **Pós-morte**: registrar causa-raiz e corrigir o controle que falhou.

---

## 7. Sobre "ofuscação / anti-engenharia reversa"

O núcleo sensível (auth, acesso ao banco, chaves) roda **no servidor** e **nunca é enviado ao navegador** — o cliente só recebe o bundle de UI, que o Next **já minifica** em produção. Ofuscar o código-fonte do servidor **não agrega segurança real** (segurança por obscuridade) e prejudica manutenção/depuração. A proteção correta é a que aplicamos: segredos fora do bundle, autorização no servidor, e headers/CSP. Por isso **não** adicionamos ofuscação artificial.
