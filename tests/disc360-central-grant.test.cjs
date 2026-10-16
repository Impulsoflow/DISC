// Unit tests for signed Central Impulso grant verification. No real credentials/Google calls.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname,'..','ScriptDisc.html'),'utf8');
const from = source.indexOf('function disc360VerifySignedCentralGrant(payload) {');
const to = source.indexOf('\nfunction handleSaveDisc(payload) {',from);
assert(from>=0 && to>from,'Verifier function not found');
const secret = 'synthetic-unit-test-only-secret-do-not-use-in-apps-script';
const env={Utilities:{
  Charset:{UTF_8:'UTF_8'},DigestAlgorithm:{SHA_256:'SHA_256'},
  computeHmacSha256Signature(s,key){return [...crypto.createHmac('sha256',key).update(s).digest()];},
  base64EncodeWebSafe(a){return Buffer.from(a).toString('base64url');},
  base64DecodeWebSafe(s){return [...Buffer.from(s,'base64url')];},
  newBlob(a){return {getDataAsString(){return Buffer.from(a).toString('utf8')}};},
  computeDigest(_a,s){return [...crypto.createHash('sha256').update(s).digest()];}
},PropertiesService:{getScriptProperties(){return {getProperty(){return env.configSecret}}}},configSecret:secret,Date,JSON,Number,Math,Object};
vm.createContext(env);vm.runInContext(source.slice(from,to),env);
const email = 'person@example.invalid';
const claim = ()=>({researchId:'disc',nonce:'a'.repeat(48),clientId:'client-unit-test',exp:Date.now()+120000,
 emailHash:crypto.createHash('sha256').update(email).digest('hex'),requestId:null});
const sign = obj =>{const p=Buffer.from(JSON.stringify(obj)).toString('base64url');
return p+'.'+crypto.createHmac('sha256',secret).update(p).digest('base64url')};
const check=(name,fn)=>{fn();console.log('PASS',name)};
check('accept valid issued DISC grant',()=>{
const v=env.disc360VerifySignedCentralGrant({email,centralAccessGrant:sign(claim())});
assert.equal(v.allowed,true);assert.equal(v.retakeAuthorized,false);
});
check('derive retake permission from signed claim only',()=>{
const c=claim();c.requestId=123;
assert.equal(env.disc360VerifySignedCentralGrant({email,centralAccessGrant:sign(c),centralRetakeAuthorized:false}).retakeAuthorized,true);
});
check('reject modified signature',()=>{
const t=sign(claim());assert.throws(()=>env.disc360VerifySignedCentralGrant({email,centralAccessGrant:t.slice(0,-1)+'A'}));
});
check('reject expired grant',()=>{
const c=claim();c.exp=Date.now()-1000;assert.throws(()=>env.disc360VerifySignedCentralGrant({email,centralAccessGrant:sign(c)}));
});
check('reject grant for another research',()=>{
const c=claim();c.researchId='empatia';assert.throws(()=>env.disc360VerifySignedCentralGrant({email,centralAccessGrant:sign(c)}));
});
check('reject forged email',()=>{
assert.throws(()=>env.disc360VerifySignedCentralGrant({email:'other@example.invalid',centralAccessGrant:sign(claim())}));
});
check('reject missing secret (fail closed)',()=>{
env.configSecret='';
assert.throws(()=>env.disc360VerifySignedCentralGrant({email,centralAccessGrant:sign(claim())}));
});
console.log('7 tests passed. Pure mocks; no production or secrets.');
