# NATA STUDIOS — Landing Page

Premium bilingual (🇧🇷 PT / 🇺🇸 EN) landing page for **NATA STUDIOS**, a software house + digital marketing agency. Built to feel like an international, high-end tech company and architected to grow into a full internal platform (dashboard).

Positioning: **Tecnologia, Design e Estratégia para transformar negócios no digital.**

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 15** (App Router) |
| Language | **TypeScript** |
| Styling | **Tailwind CSS v4** (design tokens in `globals.css`) |
| Animation | **Framer Motion** |
| i18n | **next-intl** (PT default, EN, no full page reload on switch) |
| Icons | **lucide-react** |

---

## Getting started

> **Node.js is required and was not detected on this machine.**
> Install the LTS build from <https://nodejs.org> (or `winget install OpenJS.NodeJS.LTS`), then reopen your terminal.

```bash
# 1. install dependencies
npm install

# 2. run the dev server
npm run dev
```

Open <http://localhost:3000> (Portuguese) or <http://localhost:3000/en> (English).

```bash
# production build
npm run build
npm run start
```

---

## Project structure

```
nata-studios/
├─ messages/                 # 🈺 all copy lives here — edit text without touching code
│  ├─ pt.json
│  └─ en.json
├─ public/
│  └─ favicon.svg            # drop logo.png here to use the real brand mark
├─ src/
│  ├─ middleware.ts          # next-intl locale routing
│  ├─ i18n/                  # routing / request / navigation config
│  ├─ lib/
│  │  ├─ site.ts             # ⚙️ contact info, WhatsApp & social links (EDIT THIS)
│  │  └─ clsx.ts
│  ├─ app/
│  │  ├─ [locale]/
│  │  │  ├─ layout.tsx       # fonts, metadata, <html>, i18n provider
│  │  │  ├─ page.tsx         # section composition
│  │  │  └─ not-found.tsx
│  │  ├─ not-found.tsx
│  │  └─ globals.css         # 🎨 design tokens + component classes
│  └─ components/
│     ├─ nav/                # Navbar + LanguageSwitcher
│     ├─ sections/           # Hero, Positioning, Services, WhyChooseUs, Platform, CTA
│     ├─ layout/             # Footer
│     └─ ui/                 # Logo, Reveal (scroll animation)
```

---

## Editing content

- **Text:** all strings are in `messages/pt.json` and `messages/en.json`. Keep the two files in sync (same keys).
- **Contact / socials:** update `src/lib/site.ts` (email, WhatsApp number in international format, Instagram/LinkedIn/GitHub).
- **Colors / fonts:** the design system is centralized in `src/app/globals.css` under the `@theme` block (`--color-accent`, `--color-ink`, fonts, etc.).
- **Real logo:** save the brand file to `public/logo.png` (or `logo.svg`) and swap the `<Logo />` wordmark in `Navbar.tsx` / `Footer.tsx` for a `next/image`.

### Generated imagery (`public/images/`)

AI-generated (Higgsfield / Recraft V4.1), brand palette, dark cinematic:

| File | Where it's used | Notes |
| --- | --- | --- |
| `hero-visual.png` | Hero background (35% opacity under a dark overlay) | Abstract glass + indigo/cyan light |
| `texture-bg.png` | "Why choose us" section backdrop | Subtle grid + indigo glow |
| `og-bg.png` | Open Graph / social share image | Center kept clear for the logo — final OG can composite the real logo + tagline on top |

Regenerate or swap any of them by replacing the file (keep the same name) — no code change needed.

---

## Internationalization

Switching language via the header toggle (`PT | EN`) is a **client-side transition** — the page does **not** fully reload. Default locale `pt` has no URL prefix; English lives under `/en`. Add a third language by extending `locales` in `src/i18n/routing.ts` and adding `messages/<locale>.json`.

---

## Backend — contact form & newsletter (email-based)

Two serverless API routes send email notifications via **Resend** (no database required).

| Route | Method | Purpose |
| --- | --- | --- |
| `src/app/api/contact/route.ts` | `POST` | Contact form → emails the lead to `CONTACT_TO_EMAIL` |
| `src/app/api/newsletter/route.ts` | `POST` | Newsletter signup → emails the new subscriber |

Both validate input with **zod** (`src/lib/validation.ts`), include a **honeypot** field for basic spam protection, and return JSON `{ ok: boolean }`. The forms live in `src/components/ui/ContactForm.tsx` (in the CTA section) and `NewsletterForm.tsx` (in the footer), with loading / success / error states.

### Setup

1. Create a free account at [resend.com](https://resend.com) and generate an API key.
2. Copy `.env.example` to `.env.local` and fill in:
   ```
   RESEND_API_KEY=re_...
   CONTACT_TO_EMAIL=your@email.com
   RESEND_FROM=NATA STUDIOS <onboarding@resend.dev>
   ```
   > `onboarding@resend.dev` works immediately for testing. For production, verify your domain in Resend and use a `@natastudios.com` sender.
3. `npm run dev` and submit the form — the message arrives in your inbox.

Without the env vars the routes return a `500 server_config` error (logged for the operator) — the site still runs, only sending is disabled.

## Deploy

Pronto para rodar em **VPS com Docker** (HTTPS automático via Caddy, SQLite persistente em volume).

```bash
docker compose up -d --build
```

Guia completo passo a passo: **[docs/DEPLOY.md](docs/DEPLOY.md)**
Segurança (OWASP, runbooks): **[docs/SECURITY.md](docs/SECURITY.md)**

Arquivos de deploy: `Dockerfile` · `docker-compose.yml` · `Caddyfile` · `.dockerignore` · `scripts/backup.sh` · endpoint `/api/health`.

## Plataforma NATA — internal dashboard (phase 1)

An authenticated internal area at **`/dashboard`**, separate from the localized marketing site.

**Stack:** Prisma + **SQLite** (local file `prisma/dev.db`), session auth with **jose** (JWT httpOnly cookie) + **bcryptjs**. No external account needed to run — swap the Prisma `datasource` to Postgres (Supabase) for production.

### First run

```bash
npm install
npm run db:push      # create the SQLite database from the schema
npm run db:seed      # create the admin user + sample data
npm run dev
```

Open **http://localhost:3000/dashboard** and log in:

As credenciais do admin vêm das variáveis `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
definidas no seu `.env` (arquivo local, **nunca** versionado).

Para criar ou rotacionar a senha:

```bash
SEED_ADMIN_EMAIL=voce@exemplo.com SEED_ADMIN_PASSWORD='sua-senha-forte' npm run db:seed
```

> Se o admin for criado sem `SEED_ADMIN_PASSWORD`, uma senha aleatória forte é
> gerada e impressa nos logs de boot.

`AUTH_SECRET` and `DATABASE_URL` live in `.env` (already generated).

### What's built

| Module | Status |
| --- | --- |
| Login / session / route protection (middleware) | ✅ |
| **Visão geral** — live counts + recent leads | ✅ |
| **Leads** — table of everyone from the contact form & newsletter | ✅ |
| **Clientes** — list + create (server action) | ✅ |
| Projetos · Marketing · Financeiro | 🚧 placeholders |

The public **contact form and newsletter now write to the database** (`Lead` table) *and* send the Resend email — so leads show up in the dashboard even before Resend is configured.

### Useful commands

```bash
npm run db:studio    # visual DB browser (Prisma Studio)
npm run db:push      # re-sync schema after editing prisma/schema.prisma
```

### Migrating to Postgres / Supabase later

1. Change `provider` to `postgresql` in `prisma/schema.prisma`.
2. Set `DATABASE_URL` to the Supabase connection string in `.env`.
3. `npm run db:push` (or set up migrations) and `npm run db:seed`.

### Next phases

- Projetos (kanban, tarefas, prazos, arquivos), Marketing, Financeiro, full CRM pipeline
- Lead detail view + status editing, client ↔ project relations
- Mobile navigation drawer for the dashboard (sidebar is desktop-only for now)
- User management / roles
