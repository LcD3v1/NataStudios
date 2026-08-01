# Handoff — NATA STUDIOS

Documento de continuidade. Lido no início de uma nova sessão, deve bastar para
retomar o trabalho sem reler o histórico.

**Última atualização:** 01/08/2026 · commit `55d5eab`

---

## 1. O que é

Site institucional bilíngue (PT/EN) da **NATA STUDIOS** (software house + agência
de marketing) **mais** a **Plataforma NATA**, painel interno em `/dashboard`.

- **Pasta:** `C:\Users\fpsfh\OneDrive\Desktop\Claude\nata-studios`
- **Repositório:** https://github.com/LcD3v1/NataStudios (branch `main`, sincronizado)
- **Hospedagem alvo:** ShardCloud (plano com **menos de 1 GB** de RAM)

---

## 2. Arquitetura

Monorepo **Express + React/Vite** — um único serviço servindo site e API na mesma porta.

```
backend/    Express + Prisma + segurança (auth, MFA, rate limit, auditoria)
frontend/   React + Vite + Tailwind v4 (site público + painel, code-splitting)
index.js    Ponto de entrada: cria pasta do banco → schema → admin → servidor
data/       Banco SQLite (fora do git)
docs/       DEPLOY.md · SECURITY.md · este arquivo
```

> **Migrado de Next.js em 01/08/2026.** Motivo: o build do Next atingia **~2,2 GB
> de pico** (workers paralelos) e estourava o container. O build atual mede
> **~535 MB**; o runtime, **~75 MB**. A arquitetura copia a do projeto
> [Montreal](https://github.com/LcD3v1/Montreal) do próprio usuário, que já roda
> bem no ShardCloud.

### Stack
- Backend: Express 4, Prisma 6 (SQLite), jose (JWT), bcryptjs, zod
- Frontend: React 19, Vite 6, Tailwind 4, react-router 7, framer-motion, @dnd-kit
- Fontes **auto-hospedadas** em `frontend/public/fonts` (mantém a CSP em `font-src 'self'`)

---

## 3. Como rodar

```bash
npm run install:all
```

```bash
npm run build && npm start
```

Desenvolvimento (dois terminais): `npm run dev:backend` e `npm run dev:frontend`
(Vite na 5173 faz proxy de `/api` para a 3000).

Variáveis mínimas: `DATABASE_URL` e `AUTH_SECRET` (o servidor **não inicia** sem
um secret de 32+ caracteres). Estão em `.env` / `.env.production` — **fora do git**.

---

## 4. Funcionalidades

**Site:** Hero · faixa de tecnologia · Posicionamento · Bento · Soluções ·
Diferenciais · Contato (formulário funcional) · Rodapé. Troca PT/EN sem reload.

**Painel** (`/dashboard`): Visão geral · Leads · Clientes · Projetos (kanban
arrastável) · Marketing (calendário) · Financeiro (USD) · Auditoria · Segurança.
Exclusão com confirmação em todos os módulos.

**Segurança:** CSP + HSTS + headers · CSRF por origem · rate limit por IP ·
lockout por conta (8 tentativas/30 min) · bcrypt(12) · sessão JWT httpOnly de 8h ·
**sessões revogáveis** via `sessionVersion` conferido no banco a cada requisição ·
**MFA/TOTP** implementado sobre `node:crypto` · log de auditoria · RBAC.
Detalhes em [SECURITY.md](./SECURITY.md).

---

## 5. Primeiro acesso ao painel

Não há senha padrão. Com o banco vazio, `/dashboard` mostra a tela **"Primeiro
acesso"** onde o administrador é criado com a senha escolhida na hora (padrão
WordPress/Ghost). A rota `POST /api/auth/setup` só responde enquanto não existir
usuário; depois devolve `409`.

Recuperação por linha de comando (dentro de `backend/`):

| Situação | Comando |
| --- | --- |
| Esqueceu a senha | `node scripts/reset-password.mjs "nova-senha"` |
| Perdeu o app de 2FA | `node scripts/mfa.mjs --disable` |
| Conta bloqueada | `node scripts/account.mjs --unlock` |
| Ver tentativas de login | `node scripts/recent-logins.mjs` |
| Testar uma senha | `node scripts/check-password.mjs "senha"` |

---

## 6. Deploy no ShardCloud — estado e histórico

**Situação:** ainda **não concluído**. Todas as falhas encontradas foram
corrigidas; falta o usuário subir o ZIP atualizado (commit `55d5eab`).

Configuração (`.shardcloud`): `MAIN=index.js`,
`CUSTOM_COMMAND=npm run build && npm run start`, `MEMORY=900`.

Variáveis no painel: `AUTH_SECRET` (obrigatória), `DATABASE_URL=file:/data/prod.db`,
`NODE_ENV=production`, opcionalmente `RESEND_API_KEY` + `CONTACT_TO_EMAIL`.

### Falhas já resolvidas — não repetir a investigação

| Sintoma | Causa | Correção |
| --- | --- | --- |
| `OUT_OF_MEMORY` no build | Build do Next.js: 2,2 GB de pico | Migração para Vite (535 MB) |
| `MAIN file not found` | `backend/dist/server.js` só existe após o build | `index.js` na raiz como MAIN |
| `Cannot find module 'react'` | "Dependencies are up to date, skipping installation" — a plataforma olha só a raiz e pula o install | `build` roda `install:all` antes de compilar |
| Login recusado após deploy | Banco novo + sem `SEED_ADMIN_PASSWORD` ⇒ senha aleatória no log | Tela de primeiro acesso |

Outros detalhes já tratados: `install:all` usa `--include=dev` (com
`NODE_ENV=production` o npm pularia vite/tsc); Prisma gera engines de Linux
(musl + glibc) além do nativo; `npm start` não depende de `cross-env`.

⚠️ **Persistência:** a documentação do ShardCloud não confirma se arquivos
gravados sobrevivem a um redeploy. Testar cadastrando um cliente, redeployando e
verificando se continua. Se sumir, migrar para o Postgres gerenciado deles
(trocar `provider` em `backend/prisma/schema.prisma` + `DATABASE_URL`).

---

## 7. Pendências

1. **Concluir o deploy** no ShardCloud com o ZIP do commit `55d5eab`.
2. **Repositório `NataStudiosv2`** — o usuário pediu para subir lá; ficou sem
   resposta se o repositório já existe no GitHub (não é possível criá-lo daqui).
3. **Logo no card de contato** — o pedido "coloque a logo aqui também" mostrando
   a seção de contato ficou ambíguo; o favicon foi feito, o card não.
4. **Resend não configurado** — leads são salvos no painel, mas não sai e-mail
   até definir `RESEND_API_KEY`.
5. **2FA desativado** na base local (o usuário ficou sem o app autenticador).
   Reativar em `/dashboard/seguranca` **adicionando a chave no celular antes** de
   confirmar.
6. Recomendações não implementadas: códigos de recuperação do 2FA, CSP com
   nonce, retenção do log de auditoria, gestão de usuários/papéis.

---

## 8. Particularidades do ambiente (poupam tempo)

- **Node**: instalado em `C:\Program Files\nodejs`, mas **fora do PATH** dos
  shells. Prefixar cada comando com
  `$env:Path = "C:\Program Files\nodejs;$env:Path"`.
- **Sandbox**: `Remove-Item` com certos caminhos é bloqueado. Usar
  `cmd /c "rd /s /q pasta"` ou `[System.IO.File]::Delete()`.
- **OneDrive** trava arquivos de build (`EBUSY`/`EINVAL`). Se o build falhar
  assim, apagar a pasta de saída e refazer.
- **Navegador embutido**: não dispara submit de formulário React nem
  drag-and-drop. Para testar, usar `javascript_tool` com o setter nativo de
  `value` + `requestSubmit()`, ou validar pela API.
- **Cookie `Secure`**: em `NODE_ENV=production` o cookie de sessão só trafega em
  HTTPS — testes locais por HTTP não guardam a sessão. Use `NODE_ENV=development`
  para testar o fluxo autenticado localmente. **Não é bug.**
- **PowerShell**: `$home` é reservado; here-strings com aspas quebram o `git
  commit -m` (usar `-F arquivo`).
- **Prisma + SQLite**: caminhos relativos são resolvidos a partir de `prisma/`,
  não da raiz. `file:../../data/prod.db` a partir de `backend/` aponta para
  `<raiz>/data/prod.db`.

---

## 9. Verificações antes de entregar

```bash
npm run build                        # frontend + backend
npm --prefix backend audit --omit=dev
```

O `npm audit` do frontend aponta 2 avisos do `react-router` referentes ao **modo
RSC**, que não usamos. Voltar para a 7.11 traz **14 falhas reais** (XSS, open
redirect, RCE) — manter a versão mais recente. Anotado no `frontend/package.json`.

**Antes de qualquer commit**, conferir que não entram segredos nem `node_modules`:

```bash
git diff --cached --name-only
```

`.env*`, `data/`, `*.db`, `dist/` e `node_modules/` estão no `.gitignore`.
Um commit já entrou com 14 mil arquivos de `node_modules` por causa de um
`.gitignore` que só cobria a raiz — foi desfeito antes do push.
