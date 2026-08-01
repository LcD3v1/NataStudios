import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { prisma } from './lib/prisma.js';
import { securityHeaders } from './middleware/security.js';
import { authRouter } from './routes/auth.js';
import { contactRouter } from './routes/contact.js';
import { dashboardRouter } from './routes/dashboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dist/server.js → backend/ → project root
const ROOT = path.resolve(__dirname, '..', '..');
const FRONTEND_DIST = path.join(ROOT, 'frontend', 'dist');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Behind ShardCloud/nginx: trust the proxy so req.ip and secure cookies work.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(compression());
app.use(securityHeaders);
// Small body cap — nothing here legitimately posts more than a few KB.
app.use(express.json({ limit: '64kb' }));
app.use(cookieParser());

/* ---------------- API ---------------- */

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'degraded' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/contact', contactRouter);
app.use('/api/dashboard', dashboardRouter);

// Unknown API routes must 404 as JSON, never fall through to the SPA.
app.use('/api', (_req, res) => {
  res.status(404).json({ ok: false, error: 'not_found' });
});

/* ---------------- frontend ---------------- */

if (fs.existsSync(FRONTEND_DIST)) {
  // Hashed assets can be cached hard; index.html must not be.
  app.use(
    express.static(FRONTEND_DIST, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    })
  );

  // SPA fallback — every non-API route renders the app shell.
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
} else {
  console.warn(`[server] frontend build nao encontrado em ${FRONTEND_DIST} — rode "npm run build"`);
  app.get('*', (_req, res) => {
    res.status(503).send('Frontend nao compilado. Rode: npm run build');
  });
}

/* ---------------- boot ---------------- */

function assertConfig() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    console.error(
      '\n[fatal] AUTH_SECRET ausente ou fraco (minimo 32 caracteres).\n' +
        '        Gere um com: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"\n'
    );
    process.exit(1);
  }
}

assertConfig();

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] NATA STUDIOS ouvindo na porta ${PORT}`);
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  });
}
