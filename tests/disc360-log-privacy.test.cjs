// Regressão de privacidade: PIN não pode ser persistido em log de eventos.
const fs = require("node:fs");
const assert = require("node:assert/strict");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname,"..","ScriptDisc.html"),"utf8");
const from = source.indexOf("function create360Session(data) {");
const to = source.indexOf("\nfunction ensureAvaliadosExtraColumns(",from);
assert(from >= 0 && to > from,"Não foi possível localizar a criação da sessão");
const segment = source.slice(from,to);
assert.doesNotMatch(segment,/PIN=\$\{data\.pin\}/,"PIN exposto no log de eventos");
assert.match(segment,/convite_criado=true/,"Log de evento seguro ausente");
console.log("PASS: logs de ativação não expõem o PIN.");
