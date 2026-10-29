import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID, randomBytes, createHash, scryptSync } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

test('live incident verification and district isolation', {timeout:120000}, async t=>{
  assert.ok(process.env.DATABASE_URL,'DATABASE_URL is required');
  const schema='verification_test_'+randomUUID().replaceAll('-','');
  assert.match(schema,/^verification_test_[a-f0-9]{32}$/);
  const databaseUrl=new URL(process.env.DATABASE_URL);
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(databaseUrl.hostname),'Workflow tests require a local database');
  const control=new Pool({connectionString:databaseUrl.toString()});
  databaseUrl.searchParams.set('options',`-c search_path=${schema}`);
  const pool=new Pool({connectionString:databaseUrl.toString()});
  const base='http://127.0.0.1:3117';let server;let output='';
  const activeStreams=[];
  try {
    await control.query(`CREATE SCHEMA "${schema}"`);
    await pool.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
    const accounts={};
    for(const [key,role,district] of [['admin','National Command Center Admin',null],['officer','District Disaster Officer','Nyabihu'],['outsider','District Disaster Officer','Rusizi'],['citizen','Citizen','Nyabihu'],['neighbor','Citizen','Nyabihu'],['responder','Field Responder','Nyabihu'],['chw','CHW','Nyabihu']]){
      const id=randomUUID(),token=randomBytes(32).toString('hex');
      const salt=randomBytes(16).toString('hex');
      const passwordHash=`${salt}:${scryptSync('test-login-password-only',salt,64).toString('hex')}`;
      await pool.query('INSERT INTO users(id,email,name,password_hash,role,district) VALUES($1,$2,$3,$4,$5,$6)',[id,`${key}@workflow.invalid`,key,passwordHash,role,district]);
      await pool.query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 hour')",[createHash('sha256').update(token).digest('hex'),id]);
      accounts[key]={id,token};
    }
    server=spawn(process.execPath,['--import','./lib/network-guard.mjs','node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3117'],{cwd:process.cwd(),windowsHide:true,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',DATABASE_URL:databaseUrl.toString(),APP_ORIGIN:base,HAZARD_RAINFALL_THRESHOLD_MM:'160'},stdio:['ignore','pipe','pipe']});
    server.stdout.on('data',chunk=>{output+=chunk;});server.stderr.on('data',chunk=>{output+=chunk;});
    let ready=false;
    for(let i=0;i<60;i++){if(server.exitCode!==null)throw new Error('Test server exited; verify port 3117 is available.');if(output.includes('Ready in')){ready=true;break;}await delay(250);}
    assert.ok(ready,'Test server did not start');
    async function request(account,method='GET',body){const response=await fetch(base+'/api/records',{method,headers:{Origin:base,...(account?{Cookie:`response_session=${accounts[account].token}`} : {}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json()};}
    const report=(detail='Workflow integration report')=>({kind:'report',district:'Nyabihu',data:{detail,hazardType:'Landslide',severity:'high',latitude:-1.65,longitude:29.51,sector:'Mukamira',cell:'Reported cell'}});
    const review=(id,decision='verified',reason='Reviewed evidence')=>({id,decision,reason});
    let id,rejectedId;
    await t.test('password login creates a persistent secure session and logout revokes it',async()=>{
      const login=await fetch(base+'/api/auth',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:'citizen@workflow.invalid',password:'test-login-password-only'})});
      assert.equal(login.status,200);
      const setCookie=login.headers.get('set-cookie');assert.match(setCookie,/HttpOnly/i);assert.match(setCookie,/SameSite=strict/i);assert.doesNotMatch(setCookie,/; Secure/i);
      const cookie=setCookie.split(';')[0];
      const profile=await fetch(base+'/api/auth',{headers:{Cookie:cookie}});assert.equal(profile.status,200);assert.equal((await profile.json()).user.id,accounts.citizen.id);
      assert.equal((await fetch(base+'/api/auth',{method:'DELETE',headers:{Origin:base,Cookie:cookie}})).status,200);
      assert.equal((await fetch(base+'/api/auth',{headers:{Cookie:cookie}})).status,401);
    });
    await t.test('prediction and SMS interfaces enforce operator authorization',async()=>{
      for(const endpoint of ['predict-hazard','sms']){
        for(const who of [null,'citizen','responder','chw']){
          const response=await fetch(`${base}/api/${endpoint}`,{headers:who?{Cookie:`response_session=${accounts[who].token}`}:{}});
          assert.equal(response.status,who?403:401);
        }
      }
    });
    await t.test('mock SMS persists locally with replay protection and district authorization',async()=>{
      const body={requestId:randomUUID(),district:'Nyabihu',phones:'+250788000001, +250788000001, +250788000002',message:'Local simulation test'};
      async function sms(who,payload=body){return fetch(base+'/api/sms',{method:'POST',headers:{Origin:base,Cookie:`response_session=${accounts[who].token}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});}
      for(const who of ['citizen','responder','chw','outsider'])assert.equal((await sms(who)).status,403);
      assert.equal((await sms('officer',null)).status,400);
      const response=await sms('officer');assert.equal(response.status,201);
      const result=await response.json();assert.equal(result.mode,'mock');assert.equal(result.label,'Simulated — no message sent.');assert.equal(result.results.length,2);
      for(const entry of result.results){const row=(await pool.query('SELECT * FROM sms WHERE id=$1',[entry.id])).rows[0];assert.equal(row.status,'simulated');assert.equal(row.provider_id,null);assert.equal(row.body,body.message);}
      assert.equal((await sms('officer')).status,409);
      const logs=await fetch(base+'/api/sms',{headers:{Cookie:`response_session=${accounts.officer.token}`}});assert.equal(logs.status,200);assert.equal((await logs.json()).length,2);
    });
    await t.test('CHW can submit and track a report without verification privileges',async()=>{
      const submitted=await request('chw','POST',report('CHW observation'));assert.equal(submitted.status,201);
      assert.ok((await request('chw')).data.some(row=>row.id===submitted.data.id&&row.isOwner));
      assert.equal((await request('chw','PATCH',review(submitted.data.id))).status,403);
    });
    await t.test('submission validation and server-owned pending state',async()=>{
      const invalid=report();invalid.data.latitude=91;assert.equal((await request('citizen','POST',invalid)).status,400);
      const missing=report();delete missing.data.longitude;assert.equal((await request('citizen','POST',missing)).status,400);
      const forged=report();forged.data.verification='verified';forged.data.reviewedBy=accounts.admin.id;forged.data.dispatchedAt=new Date().toISOString();
      const result=await request('citizen','POST',forged);assert.equal(result.status,201);id=result.data.id;
      const row=(await request('citizen')).data.find(r=>r.id===id);assert.equal(row.data.verification,'pending');assert.equal(row.data.reviewedBy,undefined);assert.equal(row.data.dispatchedAt,undefined);assert.equal(row.isOwner,true);
    });
    await t.test('pending reports are private to owner and district authority',async()=>{
      assert.ok((await request('officer')).data.some(r=>r.id===id));
      for(const who of ['neighbor','responder','outsider'])assert.ok(!(await request(who)).data.some(r=>r.id===id));
    });
    await t.test('RBAC and district scope cannot be bypassed',async()=>{
      assert.equal((await request(null,'PATCH',review(id))).status,401);
      assert.equal((await request('citizen','PATCH',review(id))).status,403);
      assert.equal((await request('responder','PATCH',review(id))).status,403);
      assert.equal((await request('outsider','PATCH',review(id))).status,403);
      assert.equal((await request('admin','PATCH',review('-'.repeat(36)))).status,400);
      const own=await request('officer','POST',report());assert.equal(own.status,201);
      assert.equal((await request('officer','PATCH',review(own.data.id))).status,403);
    });
    await t.test('live owner stream receives approval, and dispatch/audit commit together',async()=>{
      const abort=new AbortController();activeStreams.push(abort);
      const response=await fetch(base+'/api/records/stream',{headers:{Cookie:`response_session=${accounts.citizen.token}`},signal:abort.signal});assert.equal(response.status,200);
      const reader=response.body.getReader();let buffer='';
      async function nextSnapshot(){while(true){const index=buffer.indexOf('\n\n');if(index>=0){const event=buffer.slice(0,index);buffer=buffer.slice(index+2);const line=event.split('\n').find(l=>l.startsWith('data: '));if(line)return JSON.parse(line.slice(6));continue;}const timeout=setTimeout(()=>abort.abort(),12000);let chunk;try{chunk=await reader.read();}finally{clearTimeout(timeout);}assert.equal(chunk.done,false);buffer+=new TextDecoder().decode(chunk.value);}}
      try{
        assert.equal((await nextSnapshot()).find(r=>r.id===id).data.verification,'pending');
        assert.equal((await request('officer','PATCH',review(id))).status,200);
        let snapshot=await nextSnapshot();while(snapshot.find(r=>r.id===id).data.verification!=='verified')snapshot=await nextSnapshot();
        assert.ok(snapshot.find(r=>r.id===id).data.dispatchedAt);
        assert.ok((await request('neighbor')).data.some(r=>r.id===id));
        assert.equal((await pool.query('SELECT count(*)::int AS count FROM record_reviews WHERE record_id=$1',[id])).rows[0].count,1);
        assert.equal((await pool.query('SELECT count(*)::int AS count FROM incident_dispatches WHERE record_id=$1',[id])).rows[0].count,1);
      }finally{abort.abort();await reader.cancel().catch(()=>{});}
    });
    await t.test('duplicate/concurrent reviews cannot dispatch twice',async()=>{
      assert.equal((await request('admin','PATCH',review(id))).status,409);
      const created=await request('citizen','POST',report('Concurrent review'));
      const responses=await Promise.all([request('admin','PATCH',review(created.data.id)),request('officer','PATCH',review(created.data.id))]);
      assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
      assert.equal((await pool.query('SELECT count(*)::int AS count FROM incident_dispatches WHERE record_id=$1',[created.data.id])).rows[0].count,1);
    });
    await t.test('rejection requires a reason and does not dispatch',async()=>{
      const created=await request('citizen','POST',report('Rejected report'));rejectedId=created.data.id;
      assert.equal((await request('officer','PATCH',review(rejectedId,'rejected',''))).status,400);
      assert.equal((await request('officer','PATCH',review(rejectedId,'rejected','Insufficient evidence'))).status,200);
      const own=(await request('citizen')).data.find(r=>r.id===rejectedId);assert.equal(own.data.verification,'rejected');assert.equal(own.data.reviewReason,'Insufficient evidence');
      assert.ok(!(await request('neighbor')).data.some(r=>r.id===rejectedId));
      assert.equal((await pool.query('SELECT count(*)::int AS count FROM incident_dispatches WHERE record_id=$1',[rejectedId])).rows[0].count,0);
    });
    await t.test('configured sensor threshold creates a located pending hazard',async()=>{
      const created=await request('officer','POST',{kind:'telemetry',district:'Nyabihu',data:{detail:'Station threshold observation',rainfall:170,saturation:90,observedAt:new Date().toISOString(),latitude:-1.7,longitude:29.5}});assert.equal(created.status,201);
      const row=(await request('admin')).data.find(r=>r.id===created.data.id);assert.equal(row.data.hazardType,'Heavy precipitation');assert.equal(row.data.verification,'pending');assert.equal(row.data.latitude,-1.7);
      assert.equal((await request('admin','PATCH',review(created.data.id))).status,200);
      assert.ok((await request('neighbor')).data.some(r=>r.id===created.data.id),'Citizens can see approved sensor hazards');
    });
    await t.test('legacy unlocated reports can be rejected but not falsely mapped or approved',async()=>{
      const legacyId=randomUUID();await pool.query('INSERT INTO records(id,kind,district,data,user_id) VALUES($1,$2,$3,$4,$5)',[legacyId,'report','Nyabihu',JSON.stringify({detail:'Legacy report',verification:'unverified'}),accounts.citizen.id]);
      assert.equal((await request('officer','PATCH',review(legacyId))).status,400);
      assert.equal((await request('officer','PATCH',review(legacyId,'rejected','Please resubmit with coordinates'))).status,200);
    });
    await t.test('failed dispatch rolls back the review decision and audit',async()=>{
      const created=await request('citizen','POST',report('Rollback verification'));
      await pool.query('INSERT INTO incident_dispatches(id,record_id,district) VALUES($1,$2,$3)',[randomUUID(),created.data.id,'Nyabihu']);
      assert.equal((await request('officer','PATCH',review(created.data.id))).status,503);
      assert.equal((await request('citizen')).data.find(r=>r.id===created.data.id).data.verification,'pending');
      assert.equal((await pool.query('SELECT count(*)::int AS count FROM record_reviews WHERE record_id=$1',[created.data.id])).rows[0].count,0);
    });
    await t.test('session revocation terminates the live stream',async()=>{
      const abort=new AbortController();activeStreams.push(abort);
      const timer=setTimeout(()=>abort.abort(),12000);
      const response=await fetch(base+'/api/records/stream',{headers:{Cookie:`response_session=${accounts.neighbor.token}`},signal:abort.signal});
      const reader=response.body.getReader();
      try{
        await reader.read();
        await pool.query('DELETE FROM sessions WHERE user_id=$1',[accounts.neighbor.id]);
        let text='';while(!text.includes('event: expired')){const chunk=await reader.read();assert.equal(chunk.done,false);text+=new TextDecoder().decode(chunk.value);}
        assert.ok(text.includes('event: expired'));
      }finally{clearTimeout(timer);abort.abort();await reader.cancel().catch(()=>{});}
    });
  }finally{
    activeStreams.forEach(abort=>abort.abort());
    if(server&&server.exitCode===null){server.kill();await new Promise(resolve=>{server.once('exit',resolve);setTimeout(resolve,3000).unref();});}
    await pool.end();
    await control.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await control.end();
  }
});
