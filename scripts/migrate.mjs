import { Pool } from 'pg';
import { readFile } from 'node:fs/promises';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(await readFile(new URL('./verification.sql', import.meta.url), 'utf8'));
    await client.query('COMMIT');
    console.log('Schema migration complete. Existing records and accounts preserved.');
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
} catch (e) {
  console.error(e.code==='42501'
    ? 'Migration needs table-owner privileges. In pgAdmin, connect as postgres to this database and run scripts/verification-admin.sql. Existing data was not changed.'
    : `Migration failed: ${e.message}`);
  process.exitCode=1;
} finally { await pool.end(); }
