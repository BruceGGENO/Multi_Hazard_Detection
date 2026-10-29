import { test } from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL??'http://localhost:3000';
for(const endpoint of ['auth','records','sms']){
 test(`anonymous GET /api/${endpoint} is denied`,async()=>{const response=await fetch(`${base}/api/${endpoint}`);assert.equal(response.status,401);assert.ok((await response.json()).error);});
}
for(const endpoint of ['auth','records','sms']){
 test(`cross-origin POST /api/${endpoint} is denied before side effects`,async()=>{const response=await fetch(`${base}/api/${endpoint}`,{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'});assert.equal(response.status,403);});
}
test('malformed login is rejected',async()=>{const response=await fetch(`${base}/api/auth`,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:42,password:'x'})});assert.equal(response.status,400);});
test('cross-origin logout cannot revoke a session',async()=>{const response=await fetch(`${base}/api/auth`,{method:'DELETE',headers:{Origin:'https://untrusted.example'}});assert.equal(response.status,403);});
