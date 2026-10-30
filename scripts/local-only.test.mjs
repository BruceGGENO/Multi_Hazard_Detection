import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { localDatabaseUrl, localPredictionUrl, assertLocalOrigin } from '../lib/local-only.mjs';
test('same-origin loopback login supports aliases, trailing configuration slash and fallback ports',()=>{
  for(const address of ['localhost:3000','127.0.0.1:3000','localhost:3001','[::1]:3000']){
    assert.doesNotThrow(()=>assertLocalOrigin(`http://${address}`,address,'http:','http://localhost:3000/'));
  }
  for(const [origin,host] of [['https://evil.example','localhost:3000'],['http://localhost:4000','localhost:3000'],['http://localhost.evil.example:3000','localhost:3000'],[null,'localhost:3000'],['null','localhost:3000'],['http://localhost:3000',null]]){
    assert.throws(()=>assertLocalOrigin(origin,host,'http:','http://localhost:3000'));
  }
  assert.throws(()=>assertLocalOrigin('http://localhost:3000','localhost:3000','http:','http://public.example'));
});
test('database connections reject remote hosts and query-string overrides',()=>{
  assert.equal(new URL(localDatabaseUrl('postgresql://u:p@localhost:5432/db')).hostname,'127.0.0.1');
  for(const url of ['postgresql://u:p@cloud.example/db','postgresql://u:p@localhost/db?host=cloud.example','postgresql://u:p@localhost/db?hostaddr=8.8.8.8','https://localhost/db'])assert.throws(()=>localDatabaseUrl(url));
});
test('prediction connections restrict host, port, credentials and path',()=>{
  assert.equal(localPredictionUrl(undefined,'/model').href,'http://127.0.0.1:8000/model');
  for(const url of ['http://cloud.example:8000','https://localhost:8000','http://localhost:9000','http://u:p@localhost:8000','http://localhost:8000/path','http://localhost:8000?host=remote'])assert.throws(()=>localPredictionUrl(url,'/model'));
  assert.throws(()=>localPredictionUrl(undefined,'/redirect'));
});
test('runtime guard refuses external sockets before connection',()=>{
  const result=spawnSync(process.execPath,['--import','./lib/network-guard.mjs','--input-type=module','-e',"import net from 'node:net'; import assert from 'node:assert/strict'; assert.throws(()=>net.connect({host:'example.com',port:443}),/loopback/); assert.throws(()=>net.connect({host:'8.8.8.8',port:53}),/loopback/);"],{encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr);
});
test('mock SMS contains no gateway or HTTP implementation and prediction rejects redirects',async()=>{
  const sms=await readFile(new URL('../frontend/app/api/sms/route.ts',import.meta.url),'utf8');
  assert.doesNotMatch(sms,/fetch\s*\(|https?:\/\/|twilio|axios|https\.request/i);
  assert.match(sms,/status: 'simulated'/);assert.match(sms,/Simulated — no message sent\./);
  const hazard=await readFile(new URL('../lib/server/hazard.ts',import.meta.url),'utf8');assert.match(hazard,/redirect:'error'/);
  const map=await readFile(new URL('../frontend/components/risk-map.tsx',import.meta.url),'utf8');assert.doesNotMatch(map,/arcgisonline|cartocdn|mapbox/i);
});
