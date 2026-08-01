# Deploy — NATA STUDIOS (ShardCloud)

Arquitetura: **Express (backend) + React/Vite (frontend)** — um único serviço que
serve o site e a API na mesma porta.

> Migrado de Next.js em 2026-08. Motivo: o build do Next atingia **~2,2 GB de pico**
> (workers paralelos) e estourava a memória do container. O build atual mede
> **~535 MB** e o runtime **~73 MB**.

---

## Estrutura

```
backend/     Express + Prisma + segurança (auth, MFA, rate limit, auditoria)
frontend/    React + Vite + Tailwind (site público + painel)
data/        banco SQLite (volume persistente)
package.json scripts de build/start do monorepo
```

---

## Configuração no painel do ShardCloud

O arquivo `.shardcloud` já traz:

```
MAIN=backend/dist/server.js
CUSTOM_COMMAND=npm run install:all && npm run build && npm start
MEMORY=900
SUBDOMAIN=natastudios
```

Se o painel pedir os comandos separadamente:

| Campo | Valor |
| --- | --- |
| Install | `npm run install:all` |
| Build | `npm run build` |
| Start | `npm start` |

> A porta é injetada pela plataforma via `PORT` — **não fixe**.

---

## Variáveis de ambiente

| Variável | Obrigatória | Para quê |
| --- | --- | --- |
| `AUTH_SECRET` | **Sim** | Assina os tokens de sessão (mín. 32 caracteres). O servidor **não inicia** sem ela. |
| `DATABASE_URL` | **Sim** | Caminho do SQLite. Use o volume persistente: `file:/data/prod.db` |
| `NODE_ENV` | Recomendado | `production` (ativa cookie `Secure`) |
| `RESEND_API_KEY` | Opcional | Notificação por e-mail dos leads. Sem ela os leads ainda são salvos no painel. |
| `CONTACT_TO_EMAIL` | Opcional | Para onde vão as notificações |
| `RESEND_FROM` | Opcional | Remetente verificado na Resend |

Gerar um `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

---

## Primeiro acesso

Depois do primeiro deploy, crie o usuário administrador:

```bash
SEED_ADMIN_EMAIL=voce@natastudios.com SEED_ADMIN_PASSWORD='SUA_SENHA_FORTE' npm run db:seed
```

O mesmo comando serve para **trocar a senha** depois.

Acesse o painel em `/dashboard`.

---

## ⚠️ Persistência do banco

O SQLite fica em `DATABASE_URL`. Aponte para o **volume persistente** da plataforma
(`/data`), senão os dados somem a cada deploy.

**Como confirmar:** cadastre um cliente de teste, faça um novo deploy e veja se ele
continua lá.

- **Continua** → tudo certo.
- **Sumiu** → migre para o **PostgreSQL gerenciado** do ShardCloud:
  1. Crie o banco no painel deles
  2. Em `backend/prisma/schema.prisma`, troque `provider = "sqlite"` por `"postgresql"`
  3. Ponha a connection string em `DATABASE_URL`
  4. Redeploy (o `postinstall` roda `prisma generate` automaticamente)

---

## Desenvolvimento local

```bash
npm run install:all
```

```bash
npm run db:push && npm run db:seed
```

Dois terminais:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

O Vite (porta 5173) faz proxy de `/api` para o Express (porta 3000).

Para testar o build de produção:

```bash
npm run build && npm start
```

---

## Comandos úteis

| Ação | Comando |
| --- | --- |
| Instalar tudo | `npm run install:all` |
| Build completo | `npm run build` |
| Rodar produção | `npm start` |
| Aplicar schema | `npm run db:push` |
| Criar/alterar admin | `npm run db:seed` |
| Testes de segurança | `npm run test:security` |

---

## Checklist pós-deploy

- [ ] HTTPS ativo com certificado válido
- [ ] `AUTH_SECRET` forte e único configurado
- [ ] `DATABASE_URL` apontando para o volume persistente
- [ ] Senha do admin definida (não é a padrão)
- [ ] 2FA ativado em `/dashboard/seguranca`
- [ ] Formulário de contato testado (lead aparece em `/dashboard/leads`)
- [ ] `/dashboard` exige login (testar em aba anônima)
- [ ] Monitor de uptime apontando para `/api/health`

Detalhes de segurança e resposta a incidentes: [SECURITY.md](./SECURITY.md).
