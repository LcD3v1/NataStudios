# NATA STUDIOS

Site institucional bilíngue (🇧🇷 PT / 🇺🇸 EN) da **NATA STUDIOS** — software house
+ agência de marketing — e a **Plataforma NATA**, o painel interno de operação.

> **Tecnologia, Design e Estratégia para transformar negócios no digital.**

---

## Stack

| Camada | Escolha |
| --- | --- |
| Backend | **Express 4** + **Prisma 6** (SQLite) |
| Frontend | **React 19** + **Vite 6** + **Tailwind CSS v4** |
| Rotas | react-router 7 (SPA) · Express serve o build e a API na mesma porta |
| Auth | JWT (`jose`) em cookie httpOnly + bcrypt + TOTP/2FA |
| Animação | Framer Motion · kanban com @dnd-kit |
| i18n | Contexto próprio (PT padrão, EN, troca sem reload) |

Estrutura:

```
backend/    API, banco e camada de segurança
frontend/   site público + painel
index.js    entrada: pasta do banco → schema → admin → servidor
docs/       DEPLOY.md · SECURITY.md · HANDOFF.md
```

---

## Rodando localmente

Requer **Node.js 18+**.

```bash
npm run install:all
```

Crie um `.env` com o mínimo (o servidor não inicia sem um secret forte):

```
DATABASE_URL="file:../../data/prod.db"
AUTH_SECRET="<48 bytes aleatórios em base64>"
```

Gere o secret com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Suba em modo produção:

```bash
npm run build && npm start
```

Ou em desenvolvimento, com dois terminais:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

O Vite (5173) faz proxy de `/api` para o Express (3000).

---

## Primeiro acesso

Não existe senha padrão. Com o banco vazio, abra **`/dashboard`**: aparece a tela
de **primeiro acesso**, onde você cria o administrador com a senha que quiser.
Depois disso a tela some e o login passa a ser o normal.

Recuperação (dentro de `backend/`):

```bash
node scripts/reset-password.mjs "nova-senha"
```

```bash
node scripts/mfa.mjs --disable
```

---

## Funcionalidades

**Site** — Hero, faixa de tecnologia, posicionamento, grid bento, soluções,
diferenciais e formulário de contato que salva o lead no painel e (se a Resend
estiver configurada) envia a notificação por e-mail.

**Plataforma NATA** (`/dashboard`) — Visão geral, Leads, Clientes, Projetos
(kanban arrastável), Marketing (calendário de conteúdo), Financeiro (faturas em
USD), Auditoria e Segurança (2FA, troca de senha, encerrar sessões).

---

## Segurança

CSP + HSTS + demais headers · proteção CSRF por origem · rate limit por IP ·
bloqueio por conta · bcrypt(12) · sessões de 8h revogáveis · MFA/TOTP · registro
de auditoria · validação com zod em toda entrada.

Detalhes, mapa OWASP e runbooks: **[docs/SECURITY.md](docs/SECURITY.md)**

```bash
npm run test:security
```

---

## Deploy

Preparado para **ShardCloud** (`.shardcloud` na raiz). Guia completo, variáveis
de ambiente e solução dos problemas já enfrentados:
**[docs/DEPLOY.md](docs/DEPLOY.md)**

Retomando o trabalho em outra sessão? Comece por
**[docs/HANDOFF.md](docs/HANDOFF.md)**.
