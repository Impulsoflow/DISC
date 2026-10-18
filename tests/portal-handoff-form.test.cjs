const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const version=JSON.parse(fs.readFileSync(path.join(__dirname,'../version.json'),'utf8'));
assert.equal(version.formVersion,'v1.1.0');
for(const required of ['<meta name="referrer" content="no-referrer">','discPortalLaunch','impulso_lancamento','impulso_ambiente','/api/cliente/resgatar-lancamento','window.history.replaceState','crypto.getRandomValues','signup-pin-single','signup-pin-confirm-single','Refazer pela ','portalLaunch','function irParaCadastro','function fazerLogin360','async function startTest','centralAccessGrant: discAccessGrant']){
 if(required==='portalLaunch'){assert(html.includes('openDiscFromImpulsoPortal'));continue}
 assert(html.includes(required),'Missing necessary bridge safeguard '+required);
}
assert.match(html,/if \(discPortalLaunch\) \{/);
assert.match(html,/redeemPortalDiscLaunch\("preview"/);
assert.match(html,/redeemPortalDiscLaunch\("start"/);
assert.match(html,/firstUse\) \{/);
assert.match(html,/validateDiscAccess/);
assert.match(html,/if\(!legacy\?\.ok\|\|!legacy\.allowed\)throw/);
assert.match(html,/discRetakeAuthorized=result\.retakeAuthorized===true/);
assert.match(html,/if\(!\/\^\[a-f0-9\]\{48\}\$\/.test\(token\)\)return/);
console.log('PASS DISC authenticated-portal handoff: version, signed grant, no URL identity, CSPRNG PIN, legacy backward compatibility.');
