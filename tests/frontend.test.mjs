import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';
const folders={'one-piece':'dataop',naruto:'datanar',dxd:'datadxd','girls-und-panzer':'datagup'};
const catalogs=Object.fromEntries(await Promise.all(Object.values(folders).map(async folder=>[folder,JSON.parse(await readFile(folder+'/characters-full.json','utf8'))])));
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
globalThis.fetch=async url=>{const folder=/([^/]+)\/characters-full.json$/.exec(String(url))?.[1];assert(catalogs[folder]);return new Response(JSON.stringify(catalogs[folder]));};
const server=await createServer({configLoader:process.env.VITE_TEST_CONFIG_LOADER || 'runner',server:{middlewareMode:true},appType:'custom'});
try {
 const {api,readSaved}=await server.ssrLoadModule('/src/api.ts');
 // The library works without an active game and does not mutate saved progress.
 const beforeCatalog=JSON.stringify([...memory]);
 for(const world of Object.keys(folders)){
   const rows=catalogs[folders[world]];
   const first=await api(`/catalog?worldId=${world}&limit=40`);
   assert.equal(first.total,rows.length);assert.equal(first.characters.length,Math.min(40,rows.length));
   const collected=[];
   for(let offset=0;offset<rows.length;offset+=100){const batch=await api(`/catalog?worldId=${world}&offset=${offset}&limit=100`);collected.push(...batch.characters.map(c=>c.id));}
   assert.deepEqual(collected,rows.map(c=>c.id));
   for(const q of [rows[0].name.toUpperCase(),rows.find(c=>c.aliases?.length)?.aliases[0]??rows[0].name]){
     const expected=rows.filter(c=>[c.name,...c.aliases??[]].some(n=>n.toLocaleLowerCase().includes(q.toLocaleLowerCase())));
     const found=await api(`/catalog?worldId=${world}&q=${encodeURIComponent(' '+q+' ')}&limit=100`);
     assert.equal(found.total,expected.length);assert.deepEqual(found.characters.map(c=>c.id),expected.slice(0,100).map(c=>c.id));
   }
   const empty=await api(`/catalog?worldId=${world}&q=___no_such_character___`);assert.equal(empty.total,0);assert.deepEqual(empty.characters,[]);
   const pastEnd=await api(`/catalog?worldId=${world}&offset=${rows.length+100}`);assert.equal(pastEnd.characters.length,0);
 }
 assert.equal(JSON.stringify([...memory]),beforeCatalog);
 await assert.rejects(api('/catalog?worldId=invalid'),e=>e.code==='NO_PROFILES');
 const controller=new AbortController();controller.abort();await assert.rejects(api('/catalog?worldId=naruto',{signal:controller.signal}),e=>e.name==='AbortError');
 console.log('PASS: library world isolation, complete pagination, name and alias search, empty results, cancellation, no game mutation');
 for(const world of Object.keys(folders)){
 const data=catalogs[folders[world]];memory.set('prjhex-ui:anidle-world',world);
 const boot=await api('/bootstrap');assert.equal(boot.worlds.length,4);assert(boot.worlds.some(w=>w.id==='naruto'));assert.equal(boot.coverage.find(c=>c.worldId===world).playable,data.length);
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
 const ids=new Set();
 for(const world of Object.keys(folders)){
  const saved=JSON.parse(readSaved('game:'+world));ids.add(saved.view.id);
  memory.set('prjhex-ui:anidle-world','naruto');
  assert.equal((await api('/games/'+saved.view.id)).worldId,world);
 }
 assert.equal(ids.size,4);
 const op=JSON.parse(readSaved('game:one-piece'));const nar=JSON.parse(readSaved('game:naruto'));assert.notEqual(op.view.id,nar.view.id);assert.equal((await api('/games/'+op.view.id)).worldId,'one-piece');assert.equal((await api('/games/'+nar.view.id)).worldId,'naruto');
 console.log('PASS: catalog, guesses, duplicate protection, hint, surrender, win, restore, statistics');
}finally{await server.close();}
