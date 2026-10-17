const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const src = fs.readFileSync(path.join(__dirname, "..", "ScriptDisc.html"), "utf8");
const begin = src.indexOf("function handleAtivar360(payload) {");
const end = src.indexOf("\nfunction sendAtivacao360Email(", begin);
assert(begin >= 0 && end > begin, "Handler não encontrado");
const owner = {status:"ativo",sessionId:"sessao_disc_unica",codigo360:"DISC-A1B2C"};
const context = {
  jsonResponse: value => ({getContent(){return JSON.stringify(value)}}),
  findSessionByEmailAndPin: (email,pin) => email === "titular@example.invalid" && pin==="123456" ? owner : null,
  URL_PAGINA_CONVIDADO:"https://example.invalid/guest"
};
vm.createContext(context);
vm.runInContext(src.slice(begin,end),context);
const req={emailAvaliado:"TITULAR@example.invalid",pin:"123456",sessionId:owner.sessionId,
  scoreD:999,codigo:"DISC-FAKE1"};
const read = payload => JSON.parse(context.handleAtivar360(payload).getContent());

assert.equal(read(req).ok,true);
assert.equal(read(req).sessionId,owner.sessionId);
assert.equal(read(req).codigo,owner.codigo360);
assert.equal(read(req).linkConvidado,"https://example.invalid/guest?codigo=DISC-A1B2C");
assert.equal(owner.codigo360,"DISC-A1B2C");
console.log("PASS: PIN numérico de 6 dígitos autentica sem criar sessão nem alterar scores");

for(const [name,change] of [
  ["PIN errado",{pin:"654321"}],
  ["PIN malformado",{pin:"abcdef"}],
  ["sessão divergente",{sessionId:"outra"}],
  ["e-mail errado",{emailAvaliado:"intruso@example.invalid"}],
]) {
  assert.equal(read({...req,...change}).ok,false,name);
  console.log("PASS:",name,"rejeitado");
}
