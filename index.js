/**
 * NATA STUDIOS — entry point for ShardCloud (`MAIN=index.js`).
 *
 * Boot sequence:
 *   1. Apply the Prisma schema to the SQLite file (idempotent).
 *   2. Create the admin user on first boot (only if there are none).
 *   3. Start the Next.js production server on $PORT.
 *
 * The app must be uploaded ALREADY BUILT (`.next/` included in the ZIP) —
 * see scripts/pack-shardcloud.ps1 and docs/DEPLOY.md.
 */
const { spawnSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || '3000';

/**
 * Make sure the directory holding the SQLite file exists — Prisma will not
 * create it. Supports absolute (`file:/data/prod.db`) and relative
 * (`file:../data/prod.db`, resolved from `prisma/`) URLs.
 */
function ensureDatabaseDir() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith('file:')) return;

  const raw = url.slice('file:'.length);
  const dbPath = path.isAbsolute(raw) ? raw : path.resolve(__dirname, 'prisma', raw);
  const dir = path.dirname(dbPath);

  try {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[boot] diretorio do banco pronto: ${dir}`);
  } catch (err) {
    console.error(`[boot] nao foi possivel criar ${dir}:`, err.message);
  }
}

function run(cmd, args, label) {
  console.log(`[boot] ${label}...`);
  // No `shell` — we invoke the Node binary directly, so paths with spaces work
  // on every platform.
  const res = spawnSync(cmd, args, { stdio: 'inherit', cwd: __dirname });
  if (res.status !== 0) {
    console.error(`[boot] "${label}" falhou (exit ${res.status}).`);
  }
  return res.status === 0;
}

// 0. Make sure the SQLite directory exists (persistent volume on the host).
ensureDatabaseDir();

// 1. Ensure the database schema exists.
run(
  process.execPath,
  [path.join(__dirname, 'node_modules', 'prisma', 'build', 'index.js'), 'db', 'push', '--skip-generate'],
  'aplicando schema do banco'
);

// 2. Seed the admin user only when the table is empty.
run(process.execPath, [path.join(__dirname, 'scripts', 'ensure-admin.mjs')], 'verificando usuario admin');

// 3. Start Next.js. Uses `next start` (not a custom server) so middleware,
//    caching and routing behave exactly as in a normal deployment.
console.log(`[boot] iniciando Next.js na porta ${PORT}`);
const server = spawn(
  process.execPath,
  [path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(PORT)],
  { stdio: 'inherit', cwd: __dirname, env: { ...process.env, PORT: String(PORT) } }
);

// Forward termination signals so the platform can stop us cleanly.
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => server.kill(sig));
}
server.on('exit', (code) => process.exit(code ?? 0));
