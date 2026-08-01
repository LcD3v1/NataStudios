/**
 * Ponto de entrada da aplicação (ShardCloud: MAIN=index.js).
 *
 * Este arquivo existe no repositório — ao contrário de backend/dist/server.js,
 * que só aparece depois do build. A plataforma valida que o MAIN exista no
 * pacote enviado, por isso o boot passa por aqui.
 *
 * Sequência:
 *   1. garante a pasta do banco (o Prisma não a cria)
 *   2. aplica o schema
 *   3. cria o admin no primeiro boot, se não houver nenhum usuário
 *   4. sobe o servidor Express já compilado
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.join(__dirname, 'backend');
const SERVER = path.join(BACKEND, 'dist', 'server.js');

function run(args, label, cwd = BACKEND) {
  console.log(`[boot] ${label}...`);
  const res = spawnSync(process.execPath, args, { stdio: 'inherit', cwd });
  if (res.status !== 0) console.error(`[boot] "${label}" falhou (exit ${res.status})`);
  return res.status === 0;
}

/** O Prisma não cria o diretório do arquivo SQLite — garantimos aqui. */
function ensureDatabaseDir() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith('file:')) return;

  const raw = url.slice('file:'.length);
  // Caminhos relativos do Prisma são resolvidos a partir de `prisma/`.
  const dbPath = path.isAbsolute(raw) ? raw : path.resolve(BACKEND, 'prisma', raw);
  const dir = path.dirname(dbPath);
  try {
    mkdirSync(dir, { recursive: true });
    console.log(`[boot] diretorio do banco: ${dir}`);
  } catch (err) {
    console.error(`[boot] nao foi possivel criar ${dir}:`, err.message);
  }
}

if (!existsSync(SERVER)) {
  console.error(
    '\n[fatal] backend/dist/server.js nao encontrado.\n' +
      '        Rode o build antes de iniciar: npm run build\n'
  );
  process.exit(1);
}

ensureDatabaseDir();

// Idempotente: cria o banco na primeira vez, depois só confere.
run(
  [path.join(BACKEND, 'node_modules', 'prisma', 'build', 'index.js'), 'db', 'push', '--skip-generate'],
  'aplicando schema do banco'
);

run([path.join(BACKEND, 'scripts', 'ensure-admin.mjs')], 'verificando usuario admin');

console.log('[boot] iniciando servidor');
// pathToFileURL: no Windows, import() dinâmico exige uma URL file://,
// não um caminho absoluto como "C:\...".
await import(pathToFileURL(SERVER).href);
