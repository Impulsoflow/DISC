const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
function setup() {
  const rows = [], stats = {saved: 0, sent: 0, unlocked: 0};
  const sheet = {
    appendRow(row) { rows.push(row); }, getLastRow() {return rows.length;},
    getDataRange() { return {getValues: () => rows}; },
    getRange(row, col) {return {setValues(values) {values[0].forEach((v,i)=>rows[row-1][col-1+i]=v);}};}
  };
  let created = false;
  const session = {sessionId:'session-test', email:'test@example.invalid',status:'ativo',dataLimite:'2099-01-01'};
  const c = {console, stats, rows, session, MIN_AVALIACOES_360:3,
    jsonResponse: data => ({getContent:()=>JSON.stringify(data)}),
    getSpreadsheet:()=>({getSheetByName:()=>created?sheet:null,insertSheet:()=>{created=true;return sheet;}}),
    SpreadsheetApp:{flush(){}},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){stats.unlocked++;}})},
    Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,s)=>crypto.createHash('sha256').update(s).digest(),base64EncodeWebSafe:b=>Buffer.from(b).toString('base64url'),base64Decode:s=>Array.from(Buffer.from(s,'base64')),newBlob:()=>({})},
    findSession:()=>session,findSessionByCodigo:()=>session,findSessionByPin:()=>session,
    findSessionByEmailAndPin:()=>session,countConvidados:()=>3,
    GmailApp:{sendEmail(to){assert.equal(to,session.email);stats.sent++;}},
    handleSaveDiscOriginal:()=>{stats.saved++;return c.jsonResponse({ok:true,sessionId:session.sessionId});},
    handleSubmitConvidadoOriginal:()=>{stats.saved++;return c.jsonResponse({ok:true});}
  };
  vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/reliability.gs','utf8'),c);
  return c;
}
const read = result => JSON.parse(result.getContent());
const self = () => ({requestId:'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',nome:'Teste',email:'test@example.invalid',scoreD:8,scoreI:7,scoreS:6,scoreC:5,perfilPrimario:'D'});
const guest = () => ({requestId:'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',sessionId:'session-test',respostas:Array(24).fill(3),premium:Array(12).fill(4),relacao:'amigo',tempoConvivencia:'2 anos'});
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
for(const field of ['nome','email','scoreD','requestId']) test('reject missing '+field,()=>{const c=setup(),p=self();delete p[field];assert.equal(read(c.handleSaveDisc(p)).ok,false);assert.equal(c.rows.length,0);assert.equal(c.stats.saved,0);});
test('reject zero scores',()=>{const c=setup(),p=self();for(const k of ['scoreD','scoreI','scoreS','scoreC'])p[k]=0;assert.equal(read(c.handleSaveDisc(p)).ok,false);});
for(const field of ['respostas','premium'])test('reject incomplete '+field,()=>{const c=setup(),p=guest();p[field].pop();assert.equal(read(c.handleSubmitConvidado(p)).ok,false);assert.equal(c.rows.length,0);});
test('reject expired guest before write',()=>{const c=setup();c.session.dataLimite='2000-01-01';assert.equal(read(c.handleSubmitConvidado(guest())).ok,false);assert.equal(c.rows.length,0);});
test('reject closed guest before write',()=>{const c=setup();c.session.status='fechado';assert.equal(read(c.handleSubmitConvidado(guest())).ok,false);assert.equal(c.rows.length,0);});
for(const [method,payload] of [['handleSaveDisc',self],['handleSubmitConvidado',guest]])test('deduplicate '+method,()=>{const c=setup(),p=payload();assert.equal(read(c[method](p)).ok,true);assert.equal(read(c[method](p)).ok,true);assert.equal(c.stats.saved,1);});
test('reject changed retry',()=>{const c=setup(),p=self();c.handleSaveDisc(p);p.scoreD++;assert.equal(read(c.handleSaveDisc(p)).ok,false);assert.equal(c.stats.saved,1);});
test('partial failure cannot replay',()=>{const c=setup();c.handleSaveDiscOriginal=()=>{c.stats.saved++;throw Error('interrupted');};assert.equal(read(c.handleSaveDisc(self())).ok,false);assert.equal(read(c.handleSaveDisc(self())).ok,false);assert.equal(c.stats.saved,1);assert.equal(c.stats.unlocked,2);});
const report=()=>({requestId:'cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa',email:'test@example.invalid',pin:'123456',pdfBase64:Buffer.from('%PDF-test').toString('base64')});
test('email accepted once to authenticated recipient',()=>{const c=setup(),p=report();assert.equal(read(c.handleRelatorio360(p)).emailAccepted,true);assert.equal(read(c.handleRelatorio360(p)).ok,true);assert.equal(c.stats.sent,1);});
test('reject report without authentication',()=>{const c=setup();c.findSessionByEmailAndPin=()=>null;assert.equal(read(c.handleRelatorio360(report())).ok,false);assert.equal(c.stats.sent,0);});
test('reject report below minimum',()=>{const c=setup();c.countConvidados=()=>2;assert.equal(read(c.handleRelatorio360(report())).ok,false);assert.equal(c.stats.sent,0);});
test('reject non-PDF attachment',()=>{const c=setup(),p=report();p.pdfBase64=Buffer.from('not PDF').toString('base64');assert.equal(read(c.handleRelatorio360(p)).ok,false);assert.equal(c.stats.sent,0);});
console.log(count+' unit tests passed. Google services mocked; no production writes or email.');
