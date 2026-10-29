import { mkdir, realpath, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { localDatabaseUrl } from '../lib/local-only.mjs';
const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const directory = path.join(root, 'backups');
const url = new URL(localDatabaseUrl(process.env.DATABASE_URL));
await mkdir(directory, { recursive: true, mode: 0o700 });
const resolved = await realpath(directory);
if (resolved !== directory || resolved.startsWith('\\\\')) throw new Error('Backup directory must be a local project directory, not a link or network share');
const target = path.join(resolved, `response-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`);
const installed = 'C:/Program Files/PostgreSQL/18/bin/pg_dump.exe';
const binary = process.platform === 'win32' && existsSync(installed) ? installed : 'pg_dump';
try {
  const exit = await new Promise((resolve, reject) => {
    const child = spawn(binary, ['--format=custom', '--no-owner', '--file', target], { windowsHide: true, stdio: 'ignore', env: {
      PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP,
      PGHOST: url.hostname.replace(/^\[|\]$/g, ''), PGPORT: url.port || '5432',
      PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
      PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGCONNECT_TIMEOUT: '5',
    } });
    child.on('error', reject); child.on('exit', resolve);
  });
  if (exit !== 0 || !(await stat(target)).size) throw new Error('Backup failed');
  console.log(`Local backup saved: ${path.basename(target)}`);
} catch {
  await rm(target, { force: true });
  console.error('Local backup failed. Check pg_dump installation, version and database permissions.');
  process.exitCode = 1;
}
