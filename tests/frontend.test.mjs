import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';
const folders={'fairy-tail':'dataft','prison-school':'dataps','one-piece':'dataop',naruto:'datanar',dxd:'datadxd','girls-und-panzer':'datagup'};
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
 const boot=await api('/bootstrap');assert.equal(boot.worlds.length,6);assert(boot.worlds.some(w=>w.id==='naruto'));assert.equal(boot.coverage.find(c=>c.worldId===world).playable,data.length);
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
 // Saved gender cells must follow the updated export without resetting progress or statistics.
 const {normalizeFairyTailMagic}=await import('../js/fairy-tail-magic.js');
 const natsu=catalogs.dataft.find(c=>c.id==='Natsu_Dragneel');
 const originalMagic=[...natsu.fields.magic];
 assert.deepEqual(normalizeFairyTailMagic(natsu).fields.magic,['dragon slayer magic','transformation magic']);
 assert.deepEqual(natsu.fields.magic,originalMagic);
 for(const profile of catalogs.dataft){
   const normalized=normalizeFairyTailMagic(profile);
   assert(normalized.fields.magic.length<=3);
   assert.equal(normalized.fields.magic.length===0,!profile.fields.magic?.length,profile.id+': magic presence changed');
   if(/_\([^)]+\)$/.test(profile.id))assert(normalized.name.endsWith(profile.id.slice(profile.id.lastIndexOf('(')).replaceAll('_',' ')),profile.id);
   assert.equal(new Set(normalized.fields.magic).size,normalized.fields.magic.length);
   assert.deepEqual(normalizeFairyTailMagic(normalized),normalized);
 }
 const gajeel=normalizeFairyTailMagic(catalogs.dataft.find(c=>c.id==='Gajeel_Redfox'));
 assert.deepEqual(gajeel.fields.magic,['dragon slayer magic']);
 const edolasGajeel=normalizeFairyTailMagic(catalogs.dataft.find(c=>c.id==='Gajeel_(Edolas)'));
 assert.equal(edolasGajeel.name,'Gajeel (Edolas)');assert.deepEqual(edolasGajeel.fields.magic,[]);
 const ftSearch=await api('/characters?worldId=fairy-tail&q=Gajeel');
 assert.equal(ftSearch.characters.find(c=>c.id==='Gajeel_(Edolas)').name,'Gajeel (Edolas)');
 assert.equal(ftSearch.characters.find(c=>c.id==='Gajeel_Redfox').name,'Gajeel Redfox');
 const magicCol=GAMES.ft.columns.find(c=>c.key==='magic');
 const normalizedNatsu=normalizeFairyTailMagic(natsu);
 const mixedDragons=normalizeFairyTailMagic({id:'test',name:'Test',fields:{magic:['fire dragon slayer magic','iron dragon slayer magic','lightning dragon mode','sky dragon slayer magic','transformation magic']}});
 assert.deepEqual(mixedDragons.fields.magic,['dragon slayer magic','transformation magic']);
 assert.equal(compareField(magicCol,normalizedNatsu,gajeel),'close');
 const wendy=normalizeFairyTailMagic(catalogs.dataft.find(c=>c.id==='Wendy_Marvell'));
 assert(wendy.fields.magic.includes('dragon slayer magic'));
 assert.equal(compareField(magicCol,gajeel,{fields:{magic:['dragon slayer magic']}}),'correct');
 for(const profile of catalogs.dataft)assert(normalizeFairyTailMagic(profile).fields.magic.every(m=>!m.includes('dragon slayer magic')||m==='dragon slayer magic'),profile.id);
 assert.equal(compareField(magicCol,normalizedNatsu,{fields:{magic:['transformation magic']}}),'close');
 assert.equal(compareField(magicCol,normalizedNatsu,{fields:{magic:['dragon slayer magic']}}),'close');
 assert.equal(compareField(magicCol,normalizedNatsu,{fields:{magic:['water magic']}}),'wrong');
 assert.deepEqual(normalizeFairyTailMagic({id:'test',fields:{magic:['ice-make','molding magic','thought projection']}}).fields.magic,['molding magic']);
 const {fairyTailTranslations,translateFairyTailValue}=await import('../js/fairy-tail-localization.js');
 const {normalizeFairyTailDebut,fairyTailArcs,fairyTailQuestArcs}=await import('../js/fairy-tail-arcs.js');
 for(const row of catalogs.dataft){
   const profile=normalizeFairyTailDebut(normalizeFairyTailMagic(row));
   for(const key of ['gender','affiliation','occupation','magic']){
     const values=Array.isArray(profile.fields[key])?profile.fields[key]:[profile.fields[key]];
     for(const value of values.filter(Boolean)){
       assert(fairyTailTranslations[key][String(value).toLowerCase()],key+': '+value);
       assert.match(translateFairyTailValue(key,value),/[А-Яа-яЁё]/);
     }
   }
   assert.deepEqual(normalizeFairyTailDebut(profile),profile);
   const debutCol=GAMES.ft.columns.find(c=>c.key==='debut');
   assert.doesNotMatch(formatField(debutCol,profile.fields.debut,true),/Серия|Episode|chapter|гл\./i);
   if(profile.fields.debut?.episode)assert(profile.fields.debut.arc,row.id+': unmapped episode');
 }
 const debutCol=GAMES.ft.columns.find(c=>c.key==='debut');
 const ftProfile=id=>normalizeFairyTailDebut(normalizeFairyTailMagic(catalogs.dataft.find(c=>c.id===id)));
 assert.equal(ftProfile('Natsu_Dragneel').fields.debut.arc,'Макао');
 assert.equal(ftProfile('Gajeel_Redfox').fields.debut.arc,'Фантом Лорд');
 assert.equal(ftProfile('Gajeel_(Edolas)').fields.debut.arc,'Эдолас');
 assert.equal(ftProfile('Mercphobia').fields.debut.arc,'Столетний квест: Бог-дракон Воды');
 assert.equal(ftProfile('Wraith').fields.debut.arc,'Столетний квест: Бог-дракон Древа');
 assert.equal(ftProfile('Yoko').fields.debut.arc,'Столетний квест: Бог-дракон Луны');
 assert.equal(ftProfile('Kirin').fields.debut.arc,'Столетний квест: Великий лабиринт');
 assert.equal(ftProfile('Athena_II').fields.debut.arc,'Столетний квест: Золотая Сова');
 assert.equal(ftProfile('Faris_(Earth_Land)').fields.debut.arc,'Столетний квест: Истинный фестиваль Короля драконов');
 assert.equal(ftProfile('Zera').fields.debut.arc,'Хвост Феи: Начало');
 assert.equal(compareField(debutCol,ftProfile('Natsu_Dragneel'),ftProfile('Gray_Fullbuster')),'correct');
 assert.equal(compareField(debutCol,ftProfile('Natsu_Dragneel'),ftProfile('Mercphobia')),'up');
 assert.equal(compareField(debutCol,ftProfile('Mercphobia'),ftProfile('Natsu_Dragneel')),'down');
 for(const arc of [...fairyTailArcs,...fairyTailQuestArcs]){
   if(arc.start!==null)for(const episode of [arc.start,arc.end])assert.equal(normalizeFairyTailDebut({id:'boundary',fields:{debut:{episode,series:arc.series}}}).fields.debut.arc,arc.name);
   if(arc.chapterStart!==null)for(const chapter of [arc.chapterStart,arc.chapterEnd])assert.equal(normalizeFairyTailDebut({id:'boundary',fields:{debut:{chapter,series:arc.series}}}).fields.debut.arc,arc.name);
 }
 console.log('PASS: complete Russian Fairy Tail attribute coverage, arc boundaries and separate sequel numbering');
 const ftGender=GAMES.ft.columns.find(c=>c.key==='gender');
 for(const [id,gender] of [['Natsu_Dragneel','Male'],['Lucy_Heartfilia','Female'],['Erza_Scarlet','Female']]){
   assert.equal(catalogs.dataft.find(c=>c.id===id).fields.gender,gender);
 }
 let ftGame=await api('/games',{method:'POST',body:JSON.stringify({worldId:'fairy-tail',restart:true})});
 let ftSaved=JSON.parse(readSaved('game:fairy-tail'));
 ftSaved.target='Natsu_Dragneel';memory.set('prjhex-ui:game:fairy-tail',JSON.stringify(ftSaved));
 ftGame=await api('/games/'+ftGame.id+'/guesses',{method:'POST',body:JSON.stringify({characterId:'Lucy_Heartfilia'})});
 const ftStats=readSaved('stats:fairy-tail');
 for(const route of ['/games/'+ftGame.id,'/games']){
   ftSaved=JSON.parse(readSaved('game:fairy-tail'));
   ftSaved.view.guesses[0].character.name='outdated display name';
   ftSaved.view.debutHint='Серия 1';
   Object.assign(ftSaved.view.guesses[0].cells.find(c=>c.key==='debut'),{value:'Серия 1',match:'wrong',direction:'down'});
   Object.assign(ftSaved.view.guesses[0].cells.find(c=>c.key==='affiliation'),{value:'Fairy tail'});
   Object.assign(ftSaved.view.guesses[0].cells.find(c=>c.key==='occupation'),{value:'Mage'});
   Object.assign(ftSaved.view.guesses[0].cells.find(c=>c.key==='gender'),{value:'—',match:'correct'});
   Object.assign(ftSaved.view.guesses[0].cells.find(c=>c.key==='magic'),{value:'old detailed magic',match:'correct'});
   memory.set('prjhex-ui:game:fairy-tail',JSON.stringify(ftSaved));
   const restored=await api(route,route==='/games'?{method:'POST',body:JSON.stringify({worldId:'fairy-tail'})}:{});
   assert.equal(restored.id,ftGame.id);assert.equal(restored.guesses.length,1);assert.equal(restored.status,'playing');
   const cell=restored.guesses[0].cells.find(c=>c.key==='gender');
   assert.equal(cell.value,formatField(ftGender,'Female',true));assert.equal(cell.match,'wrong');
   assert.equal(restored.guesses[0].character.name,'Lucy Heartfilia');
   assert.equal(restored.debutHint,'Макао');
   assert.equal(restored.criteria.find(c=>c.key==='debut').label,'Арка появления');
   const debutCell=restored.guesses[0].cells.find(c=>c.key==='debut');
   assert.equal(debutCell.value,'Макао');assert.equal(debutCell.match,'correct');assert.equal(debutCell.direction,undefined);
   assert.equal(restored.guesses[0].cells.find(c=>c.key==='affiliation').value,'Хвост Феи');
   assert.equal(restored.guesses[0].cells.find(c=>c.key==='occupation').value,'Маг, писатель');
   const lucy=normalizeFairyTailMagic(catalogs.dataft.find(c=>c.id==='Lucy_Heartfilia'));
   const magicCell=restored.guesses[0].cells.find(c=>c.key==='magic');
   assert.equal(magicCell.value,formatField(magicCol,lucy.fields.magic,true));
   const expectedMatch=compareField(magicCol,lucy,normalizedNatsu);
   assert.equal(magicCell.match,expectedMatch==='close'?'partial':expectedMatch);
   assert.equal(readSaved('stats:fairy-tail'),ftStats);
   assert.equal(JSON.parse(readSaved('game:fairy-tail')).view.guesses[0].cells.find(c=>c.key==='gender').value,cell.value);
 }
 ftSaved=JSON.parse(readSaved('game:fairy-tail'));ftSaved.target='__removed_character__';
 memory.set('prjhex-ui:game:fairy-tail',JSON.stringify(ftSaved));
 await assert.rejects(api('/games/'+ftGame.id),e=>e.code==='GAME_NEEDS_RESTART');
 const replacement=await api('/games',{method:'POST',body:JSON.stringify({worldId:'fairy-tail'})});
 assert.notEqual(replacement.id,ftGame.id);assert.equal(replacement.guesses.length,0);
 assert.equal(readSaved('stats:fairy-tail'),ftStats);
 console.log('PASS: updated Fairy Tail genders, saved attempt refresh, removed target recovery');
 const ids=new Set();
 for(const world of Object.keys(folders)){
  const saved=JSON.parse(readSaved('game:'+world));ids.add(saved.view.id);
  memory.set('prjhex-ui:anidle-world','naruto');
  assert.equal((await api('/games/'+saved.view.id)).worldId,world);
 }
 assert.equal(ids.size,6);
 const op=JSON.parse(readSaved('game:one-piece'));const nar=JSON.parse(readSaved('game:naruto'));assert.notEqual(op.view.id,nar.view.id);assert.equal((await api('/games/'+op.view.id)).worldId,'one-piece');assert.equal((await api('/games/'+nar.view.id)).worldId,'naruto');
 console.log('PASS: catalog, guesses, duplicate protection, hint, surrender, win, restore, statistics');
}finally{await server.close();}
