const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'ScriptDisc.html'), 'utf8');
const fresh = () => {
  const rows = []; const stats={saved:0,mailed:0,unlocked:0,reads:0};
  let ledgerExists=false;
  const ledger={
    appendRow(v){rows.push(v);},
    getLastRow(){return rows.length;},
    getDataRange(){return {getValues(){return rows;}};},
    getRange(row,col){return {setValues(x){x[0].forEach((v,i)=>rows[row-1][col-1+i]=v);}};}
  };
  const owner={sessionId:'session-one',email:'owner@example.invalid',pin:'123456',status:'ativo',dataLimite:'2099-12-31',nome:'Teste'};
  const ctx={console, Date, Number, Math, JSON, Object,
    LockService:{getScriptLock(){return {tryLock(){return true;},releaseLock(){stats.unlocked++;}};}},
    SpreadsheetApp:{flush(){}},
    Utilities:{DigestAlgorithm:{SHA_256:'SHA256'},Charset:{UTF_8:'UTF_8'},
      computeDigest(_algo,s){return [...crypto.createHash('sha256').update(s).digest()];},
      base64EncodeWebSafe(d){return Buffer.from(d).toString('base64url');}},
  };
  vm.createContext(ctx); vm.runInContext(src,ctx);
  ctx.jsonResponse = x=>({getContent(){return JSON.stringify(x);}});
  ctx.getSpreadsheet=()=>({getSheetByName(n){return n==='Operacoes360'&&ledgerExists?ledger:null;},
     insertSheet(){ledgerExists=true;return ledger;}});
  ctx.findSessionByCodigo=()=>owner;
  ctx.findSession=()=>owner;
  ctx.findSessionByPin=()=>owner;
  ctx.findSessionByEmailAndPin=(email,pin)=>email===owner.email && pin===owner.pin?owner:null;
  ctx.handleSubmitConvidadoOriginal=p=>{stats.saved++;return ctx.jsonResponse({ok:true,totalAvaliacoes:1});};
  ctx.countConvidados=()=>2;
  ctx.getAllConvidados=()=>{stats.reads++;return [];};
  return {ctx,rows,stats,owner};
};
const guest=()=>({action:'submitConvidado',requestId:'disc360_test_request_11111111111',
  codigo:'DISC-ABCD1',sessionId:'session-one',respostas:Array(24).fill(3),premium:Array(12).fill(3),
  relacao:'Colega',tempoConvivencia:'3 anos'});
const data=r=>JSON.parse(r.getContent());
let passed=0;function check(n,f){f();passed++;console.log('PASS '+n);}
check('registrar uma vez e marcar COMPLETE',()=>{
  const s=fresh(),p=guest();assert.equal(data(s.ctx.handleSubmitConvidado(p)).ok,true);
  assert.equal(s.stats.saved,1);assert.equal(s.rows[1][3],'COMPLETE');
});
check('replay do mesmo requestId é confirmado, não regravado',()=>{
  const s=fresh(),p=guest();s.ctx.handleSubmitConvidado(p);
  assert.equal(data(s.ctx.handleSubmitConvidado(p)).duplicate,true);
  assert.equal(s.stats.saved,1);
});
check('replay com dados diferentes é rejeitado',()=>{
  const s=fresh(),p=guest();s.ctx.handleSubmitConvidado(p);
  p.respostas[0]=5; assert.equal(data(s.ctx.handleSubmitConvidado(p)).ok,false);
  assert.equal(s.stats.saved,1);
});
check('PENDING bloqueia repetição após falha parcial',()=>{
  const s=fresh(),p=guest();s.ctx.handleSubmitConvidadoOriginal=()=>{s.stats.saved++;throw Error('fail');};
  assert.equal(data(s.ctx.handleSubmitConvidado(p)).ok,false);
  assert.equal(data(s.ctx.handleSubmitConvidado(p)).ok,false);
  assert.equal(s.stats.saved,1);assert.equal(s.rows[1][3],'PENDING');
});
check('convidado expirado sem gravação',()=>{
  const s=fresh();s.owner.dataLimite='2000-01-01';
  assert.equal(data(s.ctx.handleSubmitConvidado(guest())).ok,false);assert.equal(s.rows.length,0);
});
check('convidado cancelado sem gravação',()=>{
  const s=fresh();s.owner.status='cancelado';
  assert.equal(data(s.ctx.handleSubmitConvidado(guest())).ok,false);assert.equal(s.rows.length,0);
});
check('ID de sessão incompatível sem gravação',()=>{
  const s=fresh(),p=guest();p.sessionId='session-other';
  assert.equal(data(s.ctx.handleSubmitConvidado(p)).ok,false);assert.equal(s.rows.length,0);
});
check('rejeita tentativa sem requestId',()=>{
  const s=fresh(),p=guest();delete p.requestId;
  assert.equal(data(s.ctx.handleSubmitConvidado(p)).ok,false);assert.equal(s.rows.length,0);
});
for(const [n,edit] of [
 ['24 incompletas',p=>p.respostas.pop()],
 ['escala fora',p=>p.respostas[12]=6],
 ['premium incompleto',p=>p.premium.pop()],
 ['premium string',p=>p.premium[0]='3']])
 check('rejeita '+n,()=>{const s=fresh(),p=guest();edit(p);
 assert.equal(data(s.ctx.handleSubmitConvidado(p)).ok,false);assert.equal(s.rows.length,0);});
check('mapa adulterado não altera a correção',()=>{
  const s=fresh(),p=guest();p.discScoringMap=Array(24).fill({dim:'C',reverse:false});
  const original=s.ctx.calcDiscFromResponses(p.respostas);assert.equal(original.C,18);
  assert.equal(data(s.ctx.handleSubmitConvidado(p)).ok,true);
});
check('getReport360 não permite sessão de terceiro',()=>{
 const s=fresh();const r=data(s.ctx.handleGetReport360({email:s.owner.email,pin:s.owner.pin,sessionId:'session-other'}));
 assert.equal(r.ok,false);assert.equal(s.stats.reads,0);
});
check('getStatus360 não permite acesso anônimo',()=>{
 const s=fresh();const r=data(s.ctx.handleGetStatus360({sessionId:'session-one'}));
 assert.equal(r.ok,false);
});
check('relatorio_360 bloqueia destinatário não autorizado antes do Drive/Gmail',()=>{
 const s=fresh();const r=data(s.ctx.handleRelatorio360({email:'intruso@example.invalid',pin:'000000',sessionId:'session-one',pdfBase64:'JVBERi0x'}));
 assert.equal(r.ok,false);
});
check('relatorio_360 exige mínimo antes de anexar',()=>{
 const s=fresh();const r=data(s.ctx.handleRelatorio360({email:s.owner.email,pin:s.owner.pin,sessionId:'session-one',pdfBase64:'JVBERi0x'}));
 assert.equal(r.ok,false);assert.match(r.error,/insuficientes/);
});
console.log('TOTAL: '+passed+' testes isolados, serviços externos mockados.');
