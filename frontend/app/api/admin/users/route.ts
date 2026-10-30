import { randomBytes, randomUUID, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { user, origin, failure } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { demoAccounts } from '@/lib/server/demo-auth';
import { personnelRoles, validatePersonnel } from '@/lib/user-provisioning';

export const runtime = 'nodejs';
const deriveKey = promisify(scrypt);
export async function POST(request: Request) {
 try {
  origin(request);
  const admin = await user();
  if (admin.role !== personnelRoles.ADMIN) throw new Error('403');
  const body = await request.text();
  if (body.length > 8192) throw new Error('400');
  const validation = validatePersonnel(JSON.parse(body));
  if (!validation.data) return Response.json({ error: 'Check the highlighted fields.', fields: validation.errors }, { status: 400 });
  const { name, email, district, password, role } = validation.data;
  if (demoAccounts.some(account => account.email === email)) return Response.json({ error: 'This email is reserved for an existing demo account.', fields: { email: 'A demo account already uses this email.' } }, { status: 409 });
  const salt = randomBytes(16).toString('hex');
  const derived = await deriveKey(password, salt, 64) as Buffer;
  const result = await db.query(`INSERT INTO users(id,email,name,password_hash,role,district)
   VALUES($1,$2,$3,$4,$5,$6) RETURNING id,email,name,role,district`,
   [randomUUID(), email, name, `${salt}:${derived.toString('hex')}`, personnelRoles[role], district]);
  return Response.json({ user: { ...result.rows[0], roleCode: role }, message: 'User successfully provisioned. Share the temporary password securely; no notification was sent.' }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
 } catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === '23505') return Response.json({ error: 'An account with this email already exists.', fields: { email: 'This email is already registered.' } }, { status: 409 });
  return failure(error);
 }
}
