import { randomUUID } from 'node:crypto';
import { db } from '@/lib/server/db';
import { user, scope, origin, failure } from '@/lib/server/auth';
import { readRecords } from '@/lib/server/records';
import { databaseUser } from '@/lib/server/database-user';
import { predictHazard, validateMetrics } from '@/lib/server/hazard';
import { hasCoordinates, isIncident, severities, type IncidentData } from '@/lib/incidents';
export const runtime = 'nodejs';
export async function GET() {
  try { return Response.json(await readRecords(await user()), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (e) { return failure(e); }
}
export async function POST(request: Request) {
  try {
    origin(request); const u = await user(); const payload = await request.json();
    if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('400');
    const {kind,district,data} = payload;
    if (!['report','telemetry','warning','resource','boundary','recovery'].includes(kind) || typeof district !== 'string' || !district.trim() || district.length > 80 || !data || typeof data !== 'object' || Array.isArray(data) || JSON.stringify(data).length > 200000) throw new Error('400');
    scope(u,district);
    if (kind !== 'report' && !['National Command Center Admin','District Disaster Officer'].includes(u.role)) throw new Error('403');
    if (typeof data.detail !== 'string' || !data.detail.trim() || data.detail.length > 2000) throw new Error('400');
    if (kind === 'telemetry' && (!Number.isFinite(data.rainfall) || data.rainfall < 0 || !Number.isFinite(data.saturation) || data.saturation < 0 || data.saturation > 100 || typeof data.observedAt !== 'string' || !Number.isFinite(Date.parse(data.observedAt)))) throw new Error('400');
    if (kind === 'boundary' && (!Array.isArray(data.polygon) || data.polygon.length < 3 || data.polygon.length > 10000 || !data.polygon.every((p:unknown) => Array.isArray(p) && p.length===2 && p.every(Number.isFinite) && Math.abs(p[0])<=90 && Math.abs(p[1])<=180))) throw new Error('400');
    const clean: IncidentData = { detail:data.detail.trim() };
    if(kind==='boundary') clean.polygon=data.polygon;
    if(kind==='telemetry') { clean.rainfall=data.rainfall;clean.saturation=data.saturation;clean.observedAt=data.observedAt; }
    for(const key of ['hazardType','sector','cell'] as const) {
      if(data[key] !== undefined) { if(typeof data[key]!=='string'||!data[key].trim()||data[key].length>100)throw new Error('400');clean[key]=data[key].trim(); }
    }
    if(data.latitude!==undefined||data.longitude!==undefined) { if(!hasCoordinates(data))throw new Error('400');clean.latitude=data.latitude;clean.longitude=data.longitude; }
    if(data.severity!==undefined) { if(!severities.includes(data.severity))throw new Error('400');clean.severity=data.severity; }
    // Recompute on the trusted server; client probabilities and review fields are never accepted.
    if(data.modelFeatures!==undefined) {
      if(kind!=='telemetry'&&kind!=='warning')throw new Error('400');
      clean.prediction=await predictHazard(validateMetrics(data.modelFeatures));
      clean.hazardType='Landslide';
      clean.severity=clean.prediction.riskLevel==='High Risk'?'high':clean.prediction.riskLevel==='Elevated'?'moderate':'low';
    }
    // Only an explicitly configured, locally validated threshold enables automatic flagging.
    const threshold = Number(process.env.HAZARD_RAINFALL_THRESHOLD_MM);
    if(kind==='telemetry' && Number.isFinite(threshold) && threshold>0 && data.rainfall>=threshold) {
      clean.hazardType ||= 'Heavy precipitation'; clean.severity ||= 'high';
    }
    const incident = isIncident({kind,data:clean});
    if((incident||kind==='telemetry')&&!hasCoordinates(clean))throw new Error('400');
    if(incident) { if(!clean.hazardType||!clean.severity)throw new Error('400');clean.verification='pending'; }
    const owner = await databaseUser(u);
    const result=await db.query('INSERT INTO records(id,kind,district,data,user_id) VALUES($1,$2,$3,$4,$5) RETURNING id',[randomUUID(),kind,district,JSON.stringify(clean),owner.id]);
    return Response.json(result.rows[0],{status:201});
  } catch(e) { return failure(e); }
}
export async function PATCH(request:Request) {
  try {
    origin(request); const u=await user();
    if(!['National Command Center Admin','District Disaster Officer'].includes(u.role))throw new Error('403');
    const payload=await request.json();
    if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('400');
    const {id,decision,reason}=payload;
    if(typeof id!=='string'||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).test(id)||!['verified','rejected'].includes(decision)||typeof reason!=='string'||reason.trim().length>1000||(decision==='rejected'&&!reason.trim()))throw new Error('400');
    const reviewer = await databaseUser(u);
    const client=await db.connect();
    try {
      await client.query('BEGIN');
      const found=await client.query('SELECT * FROM records WHERE id=$1 FOR UPDATE',[id]);
      const record=found.rows[0]; if(!record)throw new Error('404');
      scope(u,record.district);
      if(record.user_id===reviewer.id)throw new Error('403');
      if(!isIncident(record))throw new Error('400');
      if(['verified','rejected'].includes(record.data.verification))throw new Error('409');
      if(decision==='verified'&&(!hasCoordinates(record.data)||!record.data.hazardType||!severities.includes(record.data.severity)))throw new Error('400');
      const time=new Date().toISOString();
      const updated={...record.data,verification:decision,reviewedBy:reviewer.id,reviewedAt:time,reviewReason:reason.trim(),...(decision==='verified'?{dispatchedAt:time}:{})};
      await client.query('INSERT INTO record_reviews(record_id,reviewer_id,decision,reason) VALUES($1,$2,$3,$4)',[id,reviewer.id,decision,reason.trim()]);
      if(decision==='verified')await client.query('INSERT INTO incident_dispatches(id,record_id,district) VALUES($1,$2,$3)',[randomUUID(),id,record.district]);
      await client.query('UPDATE records SET data=$1 WHERE id=$2',[JSON.stringify(updated),id]);
      await client.query('COMMIT');return Response.json({id,data:updated});
    } catch(e) { await client.query('ROLLBACK');throw e; } finally { client.release(); }
  } catch(e) { return failure(e); }
}
