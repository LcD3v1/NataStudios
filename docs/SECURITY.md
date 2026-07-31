# Segurança — NATA STUDIOS

Documento de referência de segurança da aplicação. Cobre o que está **implementado no código**, o que depende de **infraestrutura/deploy**, e os **runbooks** de manutenção e resposta a incidentes.

> Princípio geral: **defesa em profundidade** + **menor privilégio** + **Zero Trust** (nada é confiável por padrão; toda requisição é validada e autenticada).

---

## 1. Controles implementados (no código)

### Autenticação & sessão
- Login por credenciais com **hash bcrypt (cost 12)** — nunca armazenamos senha em texto.
- **MFA/2FA (TOTP, RFC 6238)** — implementado sobre o `node:crypto` nativo (sem
  dependência de terceiros). Compatível com Google Authenticator, Authy, 1Password.
  Verificação em **tempo constante** com tolerância de ±30s de desvio de relógio.
  Gerenciado em **`/dashboard/seguranca`**; desativar exige a senha (*step-up auth*).
- Sessão via **JWT assinado (HS256, `jose`)** em cookie **`httpOnly`, `sameSite=lax`,
  `secure` em produção**, expiração de **8 horas** (reduz a janela de uso de um token roubado).
- **Sessões revogáveis (Zero Trust)**: o JWT carrega um `sessionVersion`; a cada
  requisição do painel o servidor confere contra o banco. Incrementar a versão
  (troca de senha ou "Encerrar todas as sessões") **invalida imediatamente** todos
  os tokens — algo que um JWT puro não permite.
- `AUTH_SECRET` validado no boot (mínimo 32 caracteres) — falha explícita se fraco/ausente.
- **Middleware** protege todo `/dashboard`; o layout do painel refaz a validação
  contra o banco (**defesa em profundidade** — o middleware só verifica a assinatura).
- **Brute-force em duas camadas**:
  - **por IP** — 5 tentativas / 15 min (`429` + `Retry-After`);
  - **por conta** — 8 tentativas → bloqueio de 30 min (`423`). Essa segunda camada
    barra o ataque distribuído (botnet) que trocaria de IP para burlar a primeira.
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

### Testes de segurança automatizados

Rodam com o test runner nativo do Node — **sem dependências de teste**.

```bash
npm run test:security   # 28 testes unitários (TOTP, rate limit, CSRF, validação, escaping)
npm run test:e2e        # 21 testes de ponta a ponta (precisa do servidor rodando)
npm run security:check  # testes + npm audit
npm run audit:deps      # vulnerabilidades + pacotes desatualizados
```

O `test:e2e` valida contra o servidor real: headers, proteção de rotas, CSRF,
autenticação, anti-enumeração, **MFA**, **lockout de conta** (simulando IPs
diferentes) e rate limit por IP. Aponte para outro ambiente com `BASE_URL`.

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

1. **CSP com nonce por requisição** (via middleware) para remover `'unsafe-inline'` de scripts.
2. **Gestão de usuários + papéis** (hoje há 1 admin; adicionar convite, revogação, papel `member` com permissões reduzidas).
3. **Códigos de recuperação do 2FA** — se o usuário perder o celular hoje, é preciso
   desativar o MFA direto no banco. Gerar 10 códigos de uso único no enrolamento.
4. **Rate limit distribuído (Redis)** — o atual é em memória; correto para uma única
   instância, insuficiente se escalar horizontalmente.
5. **Retenção do log de auditoria** — hoje cresce indefinidamente; adicionar expurgo
   (ex.: manter 180 dias) e alerta em picos de `login_failed`.
6. **CI de segurança** — rodar `npm run security:check` + Dependabot/CodeQL a cada PR.
7. **CAPTCHA** após N falhas, como camada extra ao lockout.

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
