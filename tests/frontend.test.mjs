import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';
const catalogs=Object.fromEntries(await Promise.all(['dataop','datanar'].map(async folder=>[folder,JSON.parse(await readFile(folder+'/characters-full.json','utf8'))])));
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
globalThis.fetch=async url=>{const folder=/([^/]+)\/characters-full.json$/.exec(String(url))?.[1];assert(catalogs[folder]);return new Response(JSON.stringify(catalogs[folder]));};
const server=await createServer({configLoader:'runner',server:{middlewareMode:true},appType:'custom'});
try {
 const {api,readSaved}=await server.ssrLoadModule('/src/api.ts');
 for(const world of ['one-piece','naruto']){
 const data=catalogs[world==='naruto'?'datanar':'dataop'];memory.set('prjhex-ui:anidle-world',world);
 const boot=await api('/bootstrap');assert.equal(boot.worlds.length,2);assert(boot.worlds.some(w=>w.id==='naruto'));assert.equal(boot.coverage.find(c=>c.worldId===world).playable,data.length);
 let game=await api('/games',{method:'POST',body:JSON.stringify({worldId:world,restart:true})});
 const id=game.id,target=JSON.parse(readSaved('game:'+world)).target;
 const wrong=data.filter(c=>c.id!==target).slice(0,10);
 await assert.rejects(api(`/games/${id}/hint`,{method:'POST'}),e=>e.code==='HINT_LOCKED');
 await assert.rejects(api(`/games/${id}/surrender`,{method:'POST'}),e=>e.code==='SURRENDER_LOCKED');
 for(let i=0;i<10;i++){game=await api(`/games/${id}/guesses`,{method:'POST',body:JSON.stringify({characterId:wrong[i].id})});assert.equal(game.guesses.length,i+1);if(i===4){assert.equal(game.debutHintAvailable,true);const hint=await api(`/games/${id}/hint`,{method:'POST'});assert.equal(typeof hint.debutHint,'string');}}
 await assert.rejects(api(`/games/${id}/guesses`,{method:'POST',body:JSON.stringify({characterId:wrong[0].id})}),e=>e.code==='DUPLICATE');
 game=await api(`/games/${id}/surrender`,{method:'POST'});assert.equal(game.status,'surrendered');assert.equal(game.answer.id,target);
 game=await api('/games',{method:'POST',body:JSON.stringify({worldId:world,restart:true})});const nextTarget=JSON.parse(readSaved('game:'+world)).target;
 game=await api(`/games/${game.id}/guesses`,{method:'POST',body:JSON.stringify({characterId:nextTarget})});assert.equal(game.status,'won');assert(game.guesses[0].cells.every(c=>c.match==='correct'));
 assert.equal((await api(`/games/${game.id}`)).status,'won');
 const final=await api('/bootstrap');assert.equal(final.stats.played,2);assert.equal(final.stats.won,1);
 }
 const op=JSON.parse(readSaved('game:one-piece'));const nar=JSON.parse(readSaved('game:naruto'));assert.notEqual(op.view.id,nar.view.id);assert.equal((await api('/games/'+op.view.id)).worldId,'one-piece');assert.equal((await api('/games/'+nar.view.id)).worldId,'naruto');
 console.log('PASS: catalog, guesses, duplicate protection, hint, surrender, win, restore, statistics');
}finally{await server.close();}
