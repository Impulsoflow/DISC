// Execute: node tests/disc360-reverse-scoring.test.cjs
// Testes locais: lê a função REAL do ScriptDisc.html, sem Sheets/Gmail/produção.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'ScriptDisc.html'), 'utf8');
const start = source.indexOf('// Contrato canônico DISC convidado v2:');
const end = source.indexOf('\nfunction calcPercentages(', start);
assert(start >= 0 && end > start, 'Bloco de cálculo canônico não encontrado');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(source.slice(start, end), sandbox);
const score = arr => JSON.parse(JSON.stringify(sandbox.calcDiscFromResponses(arr)));
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('PASS ' + name); }
check('todos marcados 1: 14 por dimensão', () =>
  assert.deepEqual(score(Array(24).fill(1)), {D:14,I:14,S:14,C:14}));
check('todos marcados 5: 22 por dimensão', () =>
  assert.deepEqual(score(Array(24).fill(5)), {D:22,I:22,S:22,C:22}));
check('todos marcados 3: 18 por dimensão', () =>
  assert.deepEqual(score(Array(24).fill(3)), {D:18,I:18,S:18,C:18}));
check('inversão dos itens 13–16', () => {
  const a = Array(24).fill(3); a[12]=1; a[13]=2; a[14]=4; a[15]=5;
  assert.deepEqual(score(a), {D:20,I:19,S:17,C:16});
});
check('inversão dos itens 21–24', () => {
  const a = Array(24).fill(3); a[20]=1; a[21]=2; a[22]=4; a[23]=5;
  assert.deepEqual(score(a), {D:20,I:19,S:17,C:16});
});
for(const [name, input] of [
  ['23 respostas',Array(23).fill(3)],['25 respostas',Array(25).fill(3)],
  ['string numérica',Array(24).fill('3')],['zero',Array(24).fill(0)],
  ['valor 6',Array(24).fill(6)],['decimal',Array(24).fill(2.5)],
  ['NaN',Array(24).fill(NaN)],['array ausente',null],
]) check('rejeita '+name,()=>assert.throws(()=>sandbox.calcDiscFromResponses(input)));
console.log(passed+' testes locais concluídos. Sem qualquer acesso a serviços reais.');
