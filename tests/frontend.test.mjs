import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';
const folders={'one-piece':'dataop',naruto:'datanar',dxd:'datadxd','girls-und-panzer':'datagup'};
const catalogs=Object.fromEntries(await Promise.all(Object.values(folders).map(async folder=>[folder,JSON.parse(await readFile(folder+'/characters-full.json','utf8'))])));
// The real Naruto export currently has no episodes: fixtures exercise the new schema without modifying it.
const actualNarutoEpisodeCount=catalogs.datanar.filter(c=>Number.isInteger((c.fields.debut??c.fields.first)?.episode)&&(c.fields.debut??c.fields.first).episode>0).length;
if(actualNarutoEpisodeCount===0)catalogs.datanar.slice(0,12).forEach((c,i)=>{c.fields.debut={episode:i+1,chapter:1000+i,series:'Naruto'};});
const playable=(world,rows)=>['one-piece','naruto'].includes(world)?rows.filter(c=>Number.isInteger((c.fields.debut??c.fields.first)?.episode)&&(c.fields.debut??c.fields.first).episode>0):rows;
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
globalThis.fetch=async url=>{const folder=/([^/]+)\/characters-full.json$/.exec(String(url))?.[1];assert(catalogs[folder]);return new Response(JSON.stringify(catalogs[folder]));};
const server=await createServer({configLoader:process.env.VITE_TEST_CONFIG_LOADER || 'runner',server:{middlewareMode:true},appType:'custom'});
try {
 const {normalizeDebut}=await server.ssrLoadModule('/js/debut-arcs.js');
 const example=normalizeDebut({fields:{debut:{episode:1,chapter:210,series:'Naruto'}}},'naruto');assert.equal(example.fields.first.arc,'Пролог — Страна Волн');
 const kiyomu=normalizeDebut(catalogs.datanar.find(c=>c.id==='Kiyomu_Fukuda'),'naruto');assert.equal(kiyomu.fields.first.arc,'Миссия по пресечению действий Акацуки');
 for(const [folder,world] of [['datanar','naruto'],['dataop','one-piece']]){const rows=catalogs[folder].filter(c=>(c.fields.debut??c.fields.first)?.episode);for(const c of rows)assert.ok(normalizeDebut(c,world).fields.first.arc,world+': '+c.id);}
 const {GAMES,compareField,formatField,numericDirection}=await server.ssrLoadModule('/js/columns.js');
 assert.equal(numericDirection(39,40),'up');assert.equal(numericDirection(40,39),'down');assert.equal(numericDirection(40,40),undefined);assert.equal(numericDirection(null,40),undefined);
 const occupation=GAMES.onepiece.columns.find(c=>c.key==='occupation');assert.equal(formatField(occupation,'Pirate',true),'Pirate');
 assert.equal(compareField(occupation,{fields:{occupation:'Pirate'}},{fields:{occupation:['pirate']}}),'correct');
 const haki=GAMES.onepiece.columns.find(c=>c.key==='haki');assert.ok(haki);assert(!GAMES.onepiece.columns.some(c=>c.key==='status'));
 assert.equal(compareField(haki,{fields:{haki:['armament haki']}},{fields:{haki:['armament haki','observation haki']}}),'close');
 assert.equal(normalizeDebut(catalogs.dataop.find(c=>c.id==='Hogan'),'one-piece').fields.first.arc,'Эльбаф');
 const {api,readSaved,normalizeNature}=await server.ssrLoadModule('/src/api.ts');
 assert.deepEqual(normalizeNature(['fire release','magnet release','lava release','boil release','yin release','yang release','yin–yang release','wood release','fire release']),['Огонь','Дерево']);
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
 assert.deepEqual(GAMES.onepiece.columns.map(c=>c.key),['age','haki','occupation','affiliation','dftype','bounty','origin','first']);
 for(const q of ['A','H','O','G','N','ho','z']){const found=await api('/characters?worldId=one-piece&q='+q);const expected=playable('one-piece',catalogs.dataop).filter(c=>c.name.toLowerCase().startsWith(q.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'})||a.id.localeCompare(b.id)).slice(0,30);assert.deepEqual(found.characters.map(c=>c.id),expected.map(c=>c.id));}
 console.log('PASS: library world isolation, complete pagination, name and alias search, empty results, cancellation, no game mutation');
 for(const world of Object.keys(folders)){
 const data=playable(world,catalogs[folders[world]]);memory.set('prjhex-ui:anidle-world',world);
 const boot=await api('/bootstrap');assert.equal(boot.worlds.length,4);assert(boot.worlds.some(w=>w.id==='naruto'));assert.equal(boot.coverage.find(c=>c.worldId===world).playable,data.length);
 let game=await api('/games',{method:'POST',body:JSON.stringify({worldId:world,restart:true})});
 const id=game.id,target=JSON.parse(readSaved('game:'+world)).target;
 if(['one-piece','naruto'].includes(world)){
  const search=await api('/characters?worldId='+world+'&q=');assert(search.characters.every(c=>data.some(row=>row.id===c.id)));
  assert(data.some(c=>c.id===target));
 }
 const wrong=data.filter(c=>c.id!==target).slice(0,10);
 await assert.rejects(api(`/games/${id}/hint`,{method:'POST'}),e=>e.code==='HINT_LOCKED');
 await assert.rejects(api(`/games/${id}/surrender`,{method:'POST'}),e=>e.code==='SURRENDER_LOCKED');
 for(let i=0;i<10;i++){game=await api(`/games/${id}/guesses`,{method:'POST',body:JSON.stringify({characterId:wrong[i].id})});assert.equal(game.guesses.length,i+1);if(i===4){assert.equal(game.debutHintAvailable,true);const hint=await api(`/games/${id}/hint`,{method:'POST'});assert.equal(typeof hint.debutHint,'string');if(['one-piece','naruto'].includes(world)){assert.doesNotMatch(hint.debutHint,/Серия|гл\.|chapter/i);}}}
 await assert.rejects(api(`/games/${id}/guesses`,{method:'POST',body:JSON.stringify({characterId:wrong[0].id})}),e=>e.code==='DUPLICATE');
 game=await api(`/games/${id}/surrender`,{method:'POST'});assert.equal(game.status,'surrendered');assert.equal(game.answer.id,target);
 game=await api('/games',{method:'POST',body:JSON.stringify({worldId:world,restart:true})});const nextTarget=JSON.parse(readSaved('game:'+world)).target;
 game=await api(`/games/${game.id}/guesses`,{method:'POST',body:JSON.stringify({characterId:nextTarget})});assert.equal(game.status,'won');assert(game.guesses[0].cells.every(c=>c.match==='correct'));if(['one-piece','naruto'].includes(world))assert.doesNotMatch(game.guesses[0].cells.find(c=>c.key==='first').value,/Серия|гл\.|chapter/i);
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
