import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from '@/lib/server/db';
import { user, hash, origin, failure } from '@/lib/server/auth';
import { createDemoSession, demoAccounts } from '@/lib/server/demo-auth';
export const runtime = 'nodejs';
export async function GET() { try { return Response.json({user:await user()}, {headers:{'Cache-Control':'no-store'}}); } catch(e){return failure(e);} }
export async function POST(request: Request) { try {
 origin(request); const payload=await request.json();
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('400');
 const {email,password}=payload;
 if(typeof email!=='string'||typeof password!=='string'||email.length>254||password.length>256) throw new Error('400');
 const key=email.trim().toLowerCase();
 try {
 const attempts=await db.query(`INSERT INTO login_attempts(email,attempts,reset_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(email) DO UPDATE SET attempts=CASE WHEN login_attempts.reset_at<now() THEN 1 ELSE login_attempts.attempts+1 END, reset_at=CASE WHEN login_attempts.reset_at<now() THEN now()+interval '15 minutes' ELSE login_attempts.reset_at END RETURNING attempts`,[key]);
 if(attempts.rows[0].attempts>10) throw new Error('429');
 const found=await db.query('SELECT * FROM users WHERE email=$1',[key]); const account=found.rows[0];
 const [salt,expected]=(account?.password_hash??`${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
 const actual=scryptSync(password,salt,64); const encoded=Buffer.from(expected,'hex');
 if(encoded.length!==actual.length||!timingSafeEqual(actual,encoded)||!account) throw new Error('401');
 const token=randomBytes(32).toString('hex');
 await db.query("INSERT INTO sessions VALUES($1,$2,now()+interval '12 hours')",[hash(token),account.id]);
 await db.query('DELETE FROM login_attempts WHERE email=$1',[key]);
 (await cookies()).set('response_session',token,{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'strict',path:'/',maxAge:43200});
 return Response.json({ok:true});
 } catch (error) {
  if (error instanceof Error && error.message === '429') throw error;
  const account = demoAccounts.find(account => account.email === key);
  if (!account || password !== 'Password123!') throw error;
  const token = createDemoSession(account);
  (await cookies()).set('response_session',token,{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'strict',path:'/',maxAge:43200});
  return Response.json({ok:true});
 }
 }catch(e){return failure(e);} }
export async function DELETE(request:Request) {try {origin(request);const jar=await cookies();const token=jar.get('response_session')?.value;if(token&&!token.startsWith('demo.'))await db.query('DELETE FROM sessions WHERE token_hash=$1',[hash(token)]);jar.delete('response_session');return Response.json({ok:true});}catch(e){return failure(e);}}
