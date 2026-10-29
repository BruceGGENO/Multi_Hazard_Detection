import { randomUUID } from 'node:crypto';
import { db } from '@/lib/server/db';
import { user, scope, origin, failure } from '@/lib/server/auth';
function gateway() { const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from } = process.env; if (!sid || !token || !from) throw new Error('503'); return { sid, from, authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') }; }
async function operator() { const u = await user(); if (!['National Command Center Admin', 'District Disaster Officer'].includes(u.role)) throw new Error('403'); return u; }
export async function GET() {
    try {
        const u = await operator(); const logs = await db.query('SELECT id,district,phone,status,provider_id,error,created_at FROM sms WHERE ($1::text IS NULL OR district=$1) ORDER BY created_at DESC LIMIT 100', [u.role === 'National Command Center Admin' ? null : u.district]);
        const pending = logs.rows.filter(r => r.provider_id && !['delivered', 'undelivered', 'failed', 'canceled'].includes(r.status));
        if (pending.length) { const g = gateway(); await Promise.all(pending.map(async r => { try { const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${g.sid}/Messages/${encodeURIComponent(r.provider_id)}.json`, { headers: { Authorization: g.authorization }, cache: 'no-store', signal: AbortSignal.timeout(5000) }); if (response.ok) { const result = await response.json(); r.status = result.status; r.error = result.error_code ? `Gateway error ${result.error_code}` : null; await db.query('UPDATE sms SET status=$1,error=$2 WHERE id=$3', [r.status, r.error, r.id]); } } catch {/* retain last confirmed state */ } })); }
        return Response.json(logs.rows, { headers: { 'Cache-Control': 'no-store' } });
    } catch (e) { return failure(e); }
}
export async function POST(request: Request) {
    try {
        origin(request); const u = await operator(); const g = gateway(); const { district, message, phones, requestId } = await request.json(); if (typeof requestId !== 'string' || !(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i).test(requestId) || typeof district !== 'string' || !district.trim() || typeof message !== 'string' || !message.trim() || message.length > 1000 || typeof phones !== 'string' || phones.length > 2000) throw new Error('400'); scope(u, district);
        const targets = phones.trim() ? phones.split(/[\s,;]+/) : (await db.query('SELECT phone FROM contacts WHERE district=$1 AND consented=true', [district])).rows.map(r => r.phone);
        const recipients = [...new Set<string>(targets)]; if (!recipients.length || recipients.length > 50 || recipients.some(p => !/^\+2507\d{8}$/.test(p))) throw new Error('400');
        const client = await db.connect(); try { await client.query('BEGIN'); await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [u.id]); const count = await client.query("SELECT count(*)::int AS total FROM sms_batches WHERE user_id=$1 AND created_at>now()-interval '15 minutes'", [u.id]); if (count.rows[0].total >= 5) throw new Error('429'); const batch = await client.query('INSERT INTO sms_batches(id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING id', [requestId, u.id]); if (!batch.rowCount) { await client.query('ROLLBACK'); return Response.json({ error: 'Dispatch already submitted. Review delivery logs before starting a new dispatch.' }, { status: 409 }); } await client.query('COMMIT'); } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
        const results = []; for (const phone of recipients) {
            const id = randomUUID(); await db.query('INSERT INTO sms(id,user_id,district,phone,body,status) VALUES($1,$2,$3,$4,$5,$6)', [id, u.id, district, phone, message, 'submitting']);
            try { const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${g.sid}/Messages.json`, { method: 'POST', headers: { Authorization: g.authorization, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ To: phone, From: g.from, Body: message }), signal: AbortSignal.timeout(10000) }); const result = await response.json(); const status = response.ok ? result.status : 'failed'; await db.query('UPDATE sms SET status=$1,provider_id=$2,error=$3 WHERE id=$4', [status, result.sid ?? null, response.ok ? null : `Gateway rejected request (${result.code ?? response.status})`, id]); results.push({ id, status }); } catch { await db.query("UPDATE sms SET status='unknown',error='Gateway response unavailable; verify provider logs before retrying' WHERE id=$1", [id]); results.push({ id, status: 'unknown' }); }
        }
        return Response.json({ results }, { status: 201 });
    } catch (e) { return failure(e); }
}
