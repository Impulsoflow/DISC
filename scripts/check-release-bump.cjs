const fs=require('node:fs');
const cp=require('node:child_process');
const current=fs.readFileSync('index.html','utf8');
const match=(s)=>s.match(/<meta name="impulso-form-version" content="(v\d+\.\d+\.\d+)">/)?.[1]||null;
const parent=cp.spawnSync('git',['show','HEAD^:index.html'],{encoding:'utf8'});
if(parent.status!==0){console.log('PASS: primeiro commit detectado; versão verificada separadamente.');process.exit(0)}
const old=parent.stdout;
if(current===old){console.log('PASS: formulário sem mudança desde o commit anterior.');process.exit(0)}
const oldVersion=match(old),newVersion=match(current);
if(!oldVersion){console.log('PASS: primeiro marco de versão do formulário.');process.exit(0)}
const num=s=>s.slice(1).split('.').map(Number);
const o=num(oldVersion),n=num(newVersion);
if(!newVersion||n[0]<o[0]||(n[0]===o[0]&&n[1]<o[1])||(n[0]===o[0]&&n[1]===o[1]&&n[2]<=o[2])){
 console.error('ERRO: modificação de index.html exige incremento de versão (atual '+oldVersion+', novo '+newVersion+').');process.exit(1)
}
console.log('PASS: formulário alterado e versão incrementada '+oldVersion+' -> '+newVersion);
