import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function compile(file, mocks = {}) {
 const module = new Module(file);
 module.require = name => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
 module._compile(ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
 }).outputText, file);
 return module.exports;
}

test('Vercel accepts a TLS Neon URL while local database restrictions remain', () => {
 const original = { VERCEL: process.env.VERCEL, DATABASE_URL: process.env.DATABASE_URL };
 try {
  const { databaseConnectionString } = compile('lib/server/db.ts', {
   pg: { Pool: class {} }, '../local-only.mjs': { localDatabaseUrl: () => 'local-only-validator' },
  });
  process.env.VERCEL = '1';
  process.env.DATABASE_URL = 'postgresql://user:password@ep-example-pooler.neon.tech/neondb?sslmode=require&channel_binding=require';
  assert.match(databaseConnectionString(), /neon\.tech/);
  for (const url of [undefined, 'postgresql://user:password@remote/db', 'https://remote/db?sslmode=require', 'postgresql://remote/db?sslmode=require&host=other']) {
   if (url === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = url;
   assert.throws(databaseConnectionString, /DATABASE_NOT_CONFIGURED/);
  }
  delete process.env.VERCEL;
  assert.equal(databaseConnectionString(), 'local-only-validator');
 } finally {
  for (const [key, value] of Object.entries(original)) {
   if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
 }
});

test('demo reports use persistent UUID owners, survive reads, and cannot be self-reviewed', async () => {
 const uuid = '11111111-1111-4111-8111-111111111111';
 const stored = [];
 let current = { id: 'demo-officer', email: 'gisarobanks@gmail.com', name: 'Billy Gisaro', role: 'District Disaster Officer', district: 'Musanze' };
 let rolledBack = false;
 const db = {
  async query(sql, values) {
   if (sql.includes('INSERT INTO users')) return { rows: [{ id: uuid }] };
   if (sql.includes('INSERT INTO records')) {
    assert.equal(values[4], uuid);
    stored.push({ id: values[0], kind: values[1], district: values[2], data: JSON.parse(values[3]), user_id: values[4] });
    return { rows: [{ id: values[0] }] };
   }
   assert.equal(values[2], uuid);
   return { rows: stored.map(row => ({ ...row, isOwner: row.user_id === values[2] })) };
  },
  async connect() { return {
   async query(sql) {
    if (sql.startsWith('SELECT')) return { rows: stored };
    if (sql === 'ROLLBACK') rolledBack = true;
    else assert.equal(sql, 'BEGIN');
    return { rows: [] };
   }, release() {},
  }; },
 };
 const identity = compile('lib/server/database-user.ts', { './db': { db } });
 const records = compile('lib/server/records.ts', { './db': { db }, './database-user': identity });
 const incidents = compile('lib/incidents.ts');
 const route = compile('frontend/app/api/records/route.ts', {
  '@/lib/server/db': { db }, '@/lib/server/database-user': identity,
  '@/lib/server/records': records, '@/lib/incidents': incidents,
  '@/lib/server/hazard': { predictHazard() { throw new Error('Unexpected prediction'); } },
  '@/lib/server/auth': {
   user: async () => current, origin() {},
   scope(user, district) { if (user.district !== district) throw new Error('403'); },
   failure: error => Response.json({}, { status: Number(error.message) || 503 }),
  },
 });
 const request = (method, body) => new Request('https://demo.vercel.app/api/records', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
 const report = { kind: 'report', district: 'Musanze', data: { detail: 'Test report', hazardType: 'Landslide', severity: 'high', latitude: -1.5, longitude: 29.6 } };
 const response = await route.POST(request('POST', report));
 assert.equal(response.status, 201);
 assert.equal((await (await route.GET()).json())[0].isOwner, true);
 assert.equal((await route.PATCH(request('PATCH', { id: stored[0].id, decision: 'verified', reason: '' }))).status, 403);
 assert.equal(rolledBack, true);
 assert.equal((await route.POST(request('POST', { ...report, district: 'Gakenke' }))).status, 403);
 const realUser = { ...current, id: uuid };
 assert.equal(await identity.databaseUser(realUser), realUser);
});
