import { randomUUID } from 'node:crypto';
import { db } from '@/lib/server/db';
import { user, scope, origin, failure } from '@/lib/server/auth';
import { databaseUser } from '@/lib/server/database-user';
export const runtime = 'nodejs';
const label = 'Simulated — no message sent.';
async function operator() {
  const u = await user();
  if (!['National Command Center Admin', 'District Disaster Officer'].includes(u.role)) throw new Error('403');
  return databaseUser(u);
}
export async function GET() {
  try {
    const u = await operator();
    const logs = await db.query('SELECT id,district,phone,status,error,created_at FROM sms WHERE ($1::text IS NULL OR district=$1) ORDER BY created_at DESC LIMIT 100', [u.role === 'National Command Center Admin' ? null : u.district]);
    return Response.json(logs.rows, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return failure(e); }
}
export async function POST(request: Request) {
  try {
    origin(request); const u = await operator();
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('400');
    const { district, message, phones, requestId } = payload as Record<string, unknown>;
    if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId) || typeof district !== 'string' || !district.trim() || district.length > 80 || typeof message !== 'string' || !message.trim() || message.length > 1000 || typeof phones !== 'string' || phones.length > 2000) throw new Error('400');
    scope(u, district);
    const targets: string[] = phones.trim() ? phones.trim().split(/[\s,;]+/).filter(Boolean) : (await db.query('SELECT phone FROM contacts WHERE district=$1 AND consented=true', [district])).rows.map(r => r.phone);
    const recipients = [...new Set(targets)];
    if (!recipients.length || recipients.length > 50 || recipients.some(p => !/^\+2507\d{8}$/.test(p))) throw new Error('400');
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [u.id]);
      const count = await client.query("SELECT count(*)::int AS total FROM sms_batches WHERE user_id=$1 AND created_at>now()-interval '15 minutes'", [u.id]);
      if (count.rows[0].total >= 5) throw new Error('429');
      const batch = await client.query('INSERT INTO sms_batches(id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING id', [requestId, u.id]);
      if (!batch.rowCount) {
        await client.query('ROLLBACK');
        return Response.json({ error: 'Simulation already recorded. No message sent.' }, { status: 409 });
      }
      const results: { id: string; status: 'simulated' }[] = [];
      for (const phone of recipients) {
        const id = randomUUID();
        await client.query('INSERT INTO sms(id,user_id,district,phone,body,status,error) VALUES($1,$2,$3,$4,$5,$6,$7)', [id, u.id, district, phone, message.trim(), 'simulated', label]);
        results.push({ id, status: 'simulated' });
      }
      await client.query('COMMIT');
      return Response.json({ mode: 'mock', label, results }, { status: 201 });
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  } catch (e) { return failure(e); }
}
