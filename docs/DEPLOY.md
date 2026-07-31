# Deploy — NATA STUDIOS

Dois caminhos suportados:

- **[A. ShardCloud](#a-deploy-no-shardcloud)** ← seu caso (upload de ZIP pelo painel)
- **[B. VPS própria com Docker](#b-deploy-em-vps-propria-docker--sqlite)**

---

# A. Deploy no ShardCloud

## Passo 1 — Gerar o pacote

No Windows, na pasta do projeto:

```bash
powershell -ExecutionPolicy Bypass -File scripts\pack-shardcloud.ps1
```

Isso faz o build e gera **`dist\nata-studios-shardcloud.zip`** (~7 MB, bem abaixo do limite de 100 MB do ShardCloud).

O ZIP já contém tudo o que a plataforma exige:

| Item | Para quê |
| --- | --- |
| `index.js` | Entry point (`MAIN` no `.shardcloud`) — aplica o schema, cria o admin e sobe o Next |
| `.shardcloud` | Configuração da plataforma (nome, memória, subdomínio) |
| `.env` | Segredos (`AUTH_SECRET`, `DATABASE_URL`, Resend) |
| `.next/` | Build de produção **já pronto** (a plataforma não precisa compilar) |
| `package.json` | Dependências (o ShardCloud roda o `npm install`) |

E **não** contém `node_modules`, `package-lock.json` nem bancos locais — como a documentação deles pede.

## Passo 2 — Ajustar antes de subir

Edite **`.env.production`** (é ele que vira o `.env` dentro do ZIP):

- `NEXT_PUBLIC_SITE_URL` → o endereço final (ex.: `https://natastudios.shardweb.app` ou seu domínio)
- `RESEND_API_KEY` → opcional; sem ela os leads continuam salvos no painel, só não sai e-mail

E, se quiser outro subdomínio, edite **`.shardcloud`**:

```
SUBDOMAIN=natastudios        →  natastudios.shardweb.app
MEMORY=1024                  →  RAM em MB (1 GB é um bom começo)
```

Depois **gere o ZIP de novo** (passo 1) para as mudanças entrarem.

## Passo 3 — Upload

1. Entre em <https://shardcloud.app/en/dash>
2. Crie um novo projeto → **upload do ZIP** `dist\nata-studios-shardcloud.zip`
3. Ambiente: **Node.js**
4. Deploy

No primeiro boot, os logs devem mostrar:

```
[boot] aplicando schema do banco...
[boot] verificando usuario admin...
[boot] admin criado: admin@natastudios.com
[boot] iniciando Next.js na porta ...
```

## Passo 4 — Acessar

- **Site:** `https://natastudios.shardweb.app`
- **Painel:** `https://natastudios.shardweb.app/dashboard`
  - As credenciais são as que você definiu em `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
    no `.env.production` (que vira o `.env` dentro do ZIP).
  - Se você não definir a senha, o primeiro boot gera uma aleatória e a imprime nos logs.

Domínio próprio: siga o guia deles em <https://docs.shardcloud.app/tutorials/platform/custom-domain> (disponível a partir do plano Core).

## ⚠️ Importante sobre o banco (SQLite)

O banco fica em **`data/prod.db`** dentro da aplicação.

A documentação do ShardCloud **não deixa claro se os arquivos gravados em runtime sobrevivem a um novo deploy**. Como o `index.js` recria o schema a cada boot, o site **nunca quebra** — mas, se a plataforma zerar o disco a cada upload, os **dados** (clientes, projetos, faturas, leads) voltariam ao estado inicial.

**Como descobrir na prática:** depois do primeiro deploy, cadastre um cliente de teste no painel, faça um segundo upload do mesmo ZIP e veja se o cliente continua lá.

- **Continua** → SQLite está persistindo, tudo certo.
- **Sumiu** → migre para o **PostgreSQL gerenciado** do próprio ShardCloud (eles oferecem):
  1. Crie um banco Postgres no painel deles
  2. Em `prisma/schema.prisma`, troque `provider = "sqlite"` por `provider = "postgresql"`
  3. Ponha a URL de conexão em `DATABASE_URL` no `.env.production`
  4. Gere o ZIP de novo e suba

> Enquanto isso, faça backups baixando o arquivo `data/prod.db` pelo painel de arquivos deles.

## Atualizar o site depois

Rode o `pack-shardcloud.ps1` de novo e faça upload do novo ZIP. Alternativa: conectar o **GitHub** no painel deles para deploy automático (nesse caso o `.next` precisa ser commitado ou a plataforma precisa rodar `npm run build`).

---

# B. Deploy em VPS própria (Docker + SQLite)

Guia para colocar o site e a Plataforma NATA no ar em uma **VPS própria** (Hostinger, Contabo, DigitalOcean, Oracle Cloud, etc.), com **HTTPS automático** e **banco SQLite persistente**.

> **Você não precisa me dar acesso à VPS.** Todos os comandos abaixo você roda no seu servidor.

---

## Pré-requisitos

- Uma VPS com **Ubuntu 22.04+** (mínimo 1 vCPU / 1 GB RAM — 2 GB recomendado)
- Um **domínio** apontando para o IP da VPS (registro **A**: `natastudios.com` → `SEU_IP`, e outro para `www`)
- Acesso SSH (`ssh root@SEU_IP`)

---

## 1. Preparar a VPS

```bash
apt update && apt upgrade -y
```

Instalar Docker:

```bash
curl -fsSL https://get.docker.com | sh
```

Firewall — abrir só o necessário (SSH + web):

```bash
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
```

> O banco **não** fica exposto: o container do app só escuta em `127.0.0.1:3000` e o Caddy é quem fala com a internet.

---

## 2. Enviar o projeto

**Opção A — via Git (recomendado):** suba o projeto para um repositório **privado** e clone:

```bash
git clone https://github.com/SEU_USUARIO/nata-studios.git /opt/nata-studios
```

**Opção B — via SCP** (do seu Windows, na pasta do projeto):

```bash
scp -r . root@SEU_IP:/opt/nata-studios
```

> ⚠️ Nunca suba `.env`, `.env.local` nem `prisma/dev.db` — já estão no `.gitignore`/`.dockerignore`.

---

## 3. Configurar os segredos

O arquivo **`.env.production`** já vem pronto no projeto com o `AUTH_SECRET` gerado. Na VPS, dentro de `/opt/nata-studios`, copie-o para `.env` e proteja:

```bash
cd /opt/nata-studios && cp .env.production .env && chmod 600 .env
```

Depois edite (`nano .env`) e ajuste:
- `NEXT_PUBLIC_SITE_URL` → seu domínio real (`https://seudominio.com`)
- `RESEND_API_KEY` → sua chave da Resend (opcional; sem ela os leads ainda são salvos no painel)

> Se quiser gerar um `AUTH_SECRET` novo: `openssl rand -base64 48`
> Trocar o secret invalida todas as sessões ativas (comportamento esperado).

---

## 4. Apontar o domínio

Edite o `Caddyfile` e troque `natastudios.com` pelo seu domínio real:

```bash
nano Caddyfile
```

---

## 5. Subir

```bash
cd /opt/nata-studios && docker compose up -d --build
```

O Caddy emite o certificado HTTPS sozinho (leva ~30s). Acompanhe:

```bash
docker compose logs -f
```

---

## 6. Criar o usuário administrador

O banco é criado automaticamente no start. Agora crie o admin:

```bash
docker compose exec -e SEED_ADMIN_EMAIL=voce@natastudios.com -e SEED_ADMIN_PASSWORD='SUA_SENHA_FORTE' app node prisma/seed.mjs
```

> Esse mesmo comando também serve para **trocar a senha** depois — basta mudar o valor de `SEED_ADMIN_PASSWORD` e rodar de novo.

Pronto: `https://natastudios.com` (site) e `https://natastudios.com/dashboard` (painel interno).

---

## 7. Backups automáticos

```bash
chmod +x /opt/nata-studios/scripts/backup.sh
```

Agendar diariamente às 3h (`crontab -e`):

```
0 3 * * * /opt/nata-studios/scripts/backup.sh >> /var/log/nata-backup.log 2>&1
```

**Restaurar** um backup:

```bash
gunzip -c /opt/nata-backups/nata-AAAAMMDD-HHMMSS.db.gz > /tmp/restore.db && docker compose stop app && docker cp /tmp/restore.db nata-app:/data/prod.db && docker compose start app
```

> Leve uma cópia dos backups para fora da VPS (S3, Backblaze, ou `rsync` para outra máquina).

---

## 8. Atualizar o site depois

```bash
cd /opt/nata-studios && git pull && docker compose up -d --build
```

Os dados ficam no volume `nata-data` e **não** são perdidos no rebuild.

---

## Comandos úteis

| Ação | Comando |
| --- | --- |
| Ver logs | `docker compose logs -f app` |
| Reiniciar | `docker compose restart app` |
| Parar tudo | `docker compose down` |
| Status/saúde | `docker compose ps` e `curl -s localhost:3000/api/health` |
| Shell no container | `docker compose exec app sh` |

---

## Checklist pós-deploy

- [ ] `https://` funcionando com cadeado (certificado válido)
- [ ] `http://` redireciona para `https://`
- [ ] Login do painel funcionando (`admin@natastudios.com`)
- [ ] `AUTH_SECRET` presente no `.env` (veio do `.env.production`)
- [ ] `.env` com `chmod 600`
- [ ] Backup rodando (rodar `./scripts/backup.sh` uma vez para testar)
- [ ] Formulário de contato testado (chega e-mail e aparece em `/dashboard/leads`)
- [ ] `/dashboard` exige login (abrir numa aba anônima para confirmar)
- [ ] Firewall ativo (`ufw status`)
- [ ] Monitor de uptime apontando para `/api/health` (UptimeRobot, grátis)

Detalhes de segurança e resposta a incidentes: [SECURITY.md](./SECURITY.md).

---

## Alternativa: hospedagem gerenciada (Vercel)

Se um dia quiser sair da VPS: a Vercel é a opção mais simples para Next.js, **mas o SQLite não funciona lá** (o disco é efêmero). Seria necessário migrar para Postgres (Supabase/Neon): trocar `provider = "postgresql"` em `prisma/schema.prisma`, apontar `DATABASE_URL` para o banco gerenciado e rodar `prisma db push`. O restante do código funciona sem alteração.
