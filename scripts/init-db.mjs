import { Pool } from 'pg';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { prompt } from './prompts.mjs';

const envPath = new URL('../.env.local', import.meta.url);
const identifier = value => '"' + value.replaceAll('"', '""') + '"';
const literal = value => "'" + value.replaceAll("'", "''") + "'";
let admin;
let app;
try {
  let contents = '';
  try { contents = await readFile(envPath, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const existing = parseEnv(contents);
  const host = await prompt('PostgreSQL host', { defaultValue: 'localhost' });
  const portText = await prompt('PostgreSQL port', { defaultValue: '5432' });
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port.');
  const user = await prompt('PostgreSQL administrator', { defaultValue: 'postgres' });
  const password = await prompt('Administrator password (input hidden)', { secret: true });
  const database = await prompt('Application database', { defaultValue: 'rwanda_response' });
  const appUser = await prompt('Application database login', { defaultValue: 'rwanda_response_app' });
  if (![database, appUser].every(name => /^[a-z][a-z0-9_]{0,62}$/.test(name))) throw new Error('Database/login names must be lowercase letters, numbers or underscores, starting with a letter (maximum 63 characters).');
  if (user === appUser || ['postgres','template0','template1'].includes(database)) throw new Error('Use a separate application database and login.');
  admin = new Pool({ host, port, user, password, database: 'postgres', connectionTimeoutMillis: 5000 });
  await admin.query('SELECT 1');
  const role = await admin.query('SELECT rolname FROM pg_roles WHERE rolname=$1', [appUser]);
  const found = await admin.query('SELECT pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname=$1', [database]);
  if (found.rowCount && found.rows[0].owner !== appUser) throw new Error('Existing database has another owner. Choose a new database; no ownership changes were made.');
  const oldUrl = existing.DATABASE_URL ? new URL(existing.DATABASE_URL) : null;
  const reusable = oldUrl && decodeURIComponent(oldUrl.username) === appUser && oldUrl.hostname === host && Number(oldUrl.port || 5432) === port && decodeURIComponent(oldUrl.pathname.slice(1)) === database;
  if (role.rowCount && !reusable) throw new Error('That database login already exists and is not configured in .env.local. Choose a new login name; its existing password will not be changed.');
  const appPassword = reusable ? decodeURIComponent(oldUrl.password) : randomBytes(32).toString('hex');
  if (!role.rowCount) {
    await admin.query(`CREATE ROLE ${identifier(appUser)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD ${literal(appPassword)}`);
    console.log('Application database login created (not a PostgreSQL superuser).');
  }
  if (!found.rowCount) {
    await admin.query(`CREATE DATABASE ${identifier(database)} OWNER ${identifier(appUser)}`);
    console.log('Application database created.');
  }
  const connection = new URL('postgresql://localhost');
  connection.hostname = host; connection.port = String(port); connection.username = appUser; connection.password = appPassword; connection.pathname = '/' + database;
  const values = { DATABASE_URL: connection.toString(), APP_ORIGIN: existing.APP_ORIGIN || 'http://localhost:3000' };
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${JSON.stringify(value)}`;
    const regex = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=.*$`, 'm');
    contents = regex.test(contents) ? contents.replace(regex, () => line) : `${contents.trimEnd()}\n${line}\n`;
  }
  // Persist generated credentials before connecting so a subsequent run can reuse them.
  await writeFile(envPath, contents.trimStart(), { mode: 0o600 });
  app = new Pool({ connectionString: connection.toString(), connectionTimeoutMillis: 5000 });
  const client = await app.connect();
  try {
    await client.query('BEGIN');
    await client.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  const result = await app.query('SELECT current_database() AS database, current_user AS login');
  console.table(result.rows);
  console.log('Tables created and .env.local configured. Administrator password was not saved.');
  console.log('Next: npm run users:create');
} catch (e) {
  console.error(`Database setup failed: ${e.message}`);
  process.exitCode = 1;
} finally { await app?.end(); await admin?.end(); }
