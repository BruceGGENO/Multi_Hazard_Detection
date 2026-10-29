import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { db, type User } from './db';
import { assertLocalOrigin } from '../local-only.mjs';
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export async function user(): Promise<User> {
 const token = (await cookies()).get('response_session')?.value;
 if (!token) throw new Error('401');
 const result = await db.query('SELECT u.id,u.name,u.role,u.district FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()', [hash(token)]);
 if (!result.rows[0]) throw new Error('401');
 return result.rows[0];
}
export function origin(request: Request) {
 assertLocalOrigin(request.headers.get('origin'), request.headers.get('host'), new URL(request.url).protocol, process.env.APP_ORIGIN);
}
export function scope(u: User, district: string) { if (u.role !== 'National Command Center Admin' && u.district !== district) throw new Error('403'); }
export function failure(e: unknown) {
 const message = e instanceof Error ? e.message : '';
 if(message==='ORIGIN_REJECTED')return Response.json({error:'Request origin rejected. Open this app directly on localhost or 127.0.0.1 using the port printed in your terminal. External pages and requests from a different port are blocked.'},{status:403});
 const status = e instanceof SyntaxError ? 400 : ['400','401','403','404','409','429','503'].includes(message) ? Number(message) : 503;
 if(status===503) console.error('Service request failed', e instanceof Error ? e.name : 'Unknown error');
 return Response.json({error: ({400:'Invalid request. Check required fields and coordinates.',401:'Sign in required or invalid credentials',403:'Access denied for your role, district, or this action. Incident review also requires a different reporter.',404:'Record not found',409:'This incident has already been reviewed. Refresh the queue.',429:'Request limit reached. Try again in 15 minutes.',503:'Service unavailable. Check server configuration and database.'} as Record<number,string>)[status]}, {status});
}
