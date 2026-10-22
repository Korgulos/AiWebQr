import assert from 'node:assert/strict';
const origin='https://www.qr-gen-me.com';
for (const [path,status] of [['/',200],['/arte-qr-gen',200],['/login',200],['/api/campaigns',401],['/analytics-draft',404]]) {
 const response=await fetch(origin+path,{signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,status,`${path} status`);
 if(path==='/') assert.match(await response.text(),/QR/);
 console.log(`PASS ${path}: HTTP ${status}`);
}
const guarded=await fetch(origin+'/qr-gen',{redirect:'manual',signal:AbortSignal.timeout(30000)});
assert.ok([302,303,307].includes(guarded.status));
assert.equal(new URL(guarded.headers.get('location'),origin).pathname,'/');
console.log('PASS anonymous QR generator redirects home');
