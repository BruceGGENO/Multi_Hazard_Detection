import { localDatabaseUrl } from '../lib/local-only.mjs';
import { Pool } from 'pg';
import { randomUUID, randomBytes, scryptSync } from 'node:crypto';
import { prompt, newPassword } from './prompts.mjs';

const roles = ['National Command Center Admin', 'District Disaster Officer', 'Field Responder', 'Citizen', 'CHW'];
const pool = new Pool({ connectionString: localDatabaseUrl(process.env.DATABASE_URL), connectionTimeoutMillis: 5000 });
const passwordHash = password => { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; };
try {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing. Run npm run db:init first.');
  const command = process.argv[2];
  if (command === 'list') {
    const users = await pool.query('SELECT email,name,role,district FROM users ORDER BY email');
    console.table(users.rows);
    console.log(`${users.rowCount} users. Passwords and password hashes are never displayed.`);
  } else if (command === 'create') {
    const email = (await prompt('Login email')).trim().toLowerCase();
    const name = (await prompt('Full name')).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || name.length > 200) throw new Error('Enter a valid email and a name (maximum 200 characters).');
    roles.forEach((role, index) => console.log(`${index + 1}. ${role}`));
    const choice = await prompt('Role number', { defaultValue: '1' });
    if (!/^[1-5]$/.test(choice)) throw new Error('Choose a role from 1 to 5.');
    const role = roles[Number(choice) - 1];
    const district = role === roles[0] ? null : (await prompt('Assigned district (e.g. Nyabihu)')).trim();
    if (role !== roles[0] && (!district || district.length > 80)) throw new Error('A district assignment is required (maximum 80 characters).');
    const password = await newPassword();
    await pool.query('INSERT INTO users(id,email,name,password_hash,role,district) VALUES($1,$2,$3,$4,$5,$6)', [randomUUID(), email, name, passwordHash(password), role, district]);
    console.log(`User created. Login email: ${email}. Use the password you entered.`);
  } else if (command === 'reset') {
    const email = (await prompt('Email of user to reset')).trim().toLowerCase();
    const found = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (!found.rowCount) throw new Error('No user found with that email.');
    const password = await newPassword();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [passwordHash(password), found.rows[0].id]);
      await client.query('DELETE FROM sessions WHERE user_id=$1', [found.rows[0].id]);
      await client.query('DELETE FROM login_attempts WHERE email=$1', [email]);
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    console.log('Password reset. Existing sessions revoked and login lockout cleared.');
  } else if (command === 'check') {
    const result = await pool.query('SELECT current_database() AS database,current_user AS login');
    console.table(result.rows);
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name");
    console.table(tables.rows);
    const users = await pool.query('SELECT count(*)::int AS users FROM users');
    console.log(`Connection verified. ${users.rows[0].users} application users.`);
  } else throw new Error('Usage: users.mjs create | list | reset | check');
} catch (e) {
  console.error(e.code === '23505' ? 'A user with that email already exists. Use users:reset to change their password.' : `User management failed: ${e.message}`);
  process.exitCode = 1;
} finally { await pool.end(); }
