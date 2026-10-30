import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function compile(file, mocks = {}) {
 const mod = new Module(file);
 mod.require = key => Object.hasOwn(mocks, key) ? mocks[key] : require(key);
 mod._compile(ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
 return mod.exports;
}
const schema = compile('lib/user-provisioning.ts');
const demo = compile('lib/server/demo-auth.ts');
const input = { name: 'New Officer', email: 'officer@example.com', role: 'DISTRICT_OFFICER', district: 'Musanze', password: 'CustomPassword123!' };
test('personnel schema rejects malformed fields and accepts all role codes', () => {
 for (const role of Object.keys(schema.personnelRoles)) assert.ok(schema.validatePersonnel({ ...input, role }).data);
 for (const value of [null, [], {}, { ...input, name: 'x'.repeat(200) }, { ...input, email: 'bad' }, { ...input, role: 'toString' }, { ...input, district: '' }, { ...input, password: 'short' }]) assert.equal(schema.validatePersonnel(value).data, undefined);
 assert.equal(schema.validatePersonnel({ ...input, email: ' OFFICER@EXAMPLE.COM ' }).data.email, input.email);
});
test('admin provisioning enforces RBAC, hashes passwords, handles conflicts, and supports login', async () => {
 let role = schema.personnelRoles.ADMIN;
 let authenticated = true, allowedOrigin = true, writes = 0;
 const rows = new Map();
 const auth = {
  user: async () => { if (!authenticated) throw new Error('401'); return { role }; },
  origin: () => { if (!allowedOrigin) throw new Error('403'); },
  failure: error => Response.json({ error: 'Request failed' }, { status: error instanceof SyntaxError ? 400 : Number(error.message) || 503 }),
  hash: value => value,
 };
 const db = { query: async (sql, values) => {
  if (sql.startsWith('INSERT INTO users')) {
   if (rows.has(values[1])) throw Object.assign(new Error('duplicate'), { code: '23505' });
   const [id, email, name, password_hash, role, district] = values;
   const row = { id, email, name, password_hash, role, district }; rows.set(email, row); writes++;
   const { password_hash: _, ...publicRow } = row;
   return { rows: [publicRow] };
  }
  if (sql.startsWith('INSERT INTO login_attempts')) return { rows: [{ attempts: 1 }] };
  if (sql.startsWith('SELECT * FROM users')) return { rows: rows.has(values[0]) ? [rows.get(values[0])] : [] };
  return { rows: [] };
 } };
 const route = compile('frontend/app/api/admin/users/route.ts', { '@/lib/server/auth': auth, '@/lib/server/db': { db }, '@/lib/server/demo-auth': demo, '@/lib/user-provisioning': schema });
 const request = body => new Request('https://demo.vercel.app/api/admin/users', { method: 'POST', body: JSON.stringify(body) });
 authenticated = false; assert.equal((await route.POST(request(input))).status, 401); authenticated = true;
 for (const denied of Object.values(schema.personnelRoles).filter(value => value !== schema.personnelRoles.ADMIN)) { role = denied; assert.equal((await route.POST(request(input))).status, 403); }
 role = schema.personnelRoles.ADMIN;
 allowedOrigin = false; assert.equal((await route.POST(request(input))).status, 403); allowedOrigin = true;
 assert.equal((await route.POST(request({ ...input, email: 'invalid' }))).status, 400);
 assert.equal((await route.POST(request({ ...input, email: demo.demoAccounts[0].email }))).status, 409);
 assert.equal(writes, 0);
 const response = await route.POST(request(input));
 assert.equal(response.status, 201);
 const result = await response.json(); assert.equal(result.user.roleCode, 'DISTRICT_OFFICER');
 assert.equal(JSON.stringify(result).includes(input.password), false); assert.equal('password_hash' in result.user, false);
 assert.match(rows.get(input.email).password_hash, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
 assert.equal((await route.POST(request({ ...input, email: 'OFFICER@EXAMPLE.COM' }))).status, 409);
 let cookie;
 const login = compile('frontend/app/api/auth/route.ts', {
  'next/headers': { cookies: async () => ({ set: (_name, token) => { cookie = token; } }) },
  '@/lib/server/auth': auth, '@/lib/server/db': { db }, '@/lib/server/demo-auth': demo,
 });
 assert.equal((await login.POST(request({ email: input.email, password: input.password }))).status, 200);
 assert.ok(cookie);
 assert.equal((await login.POST(request({ email: input.email, password: 'WrongPassword123!' }))).status, 401);
});
