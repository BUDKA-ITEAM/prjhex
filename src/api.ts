import { GAMES, compareField, formatField } from '../js/columns.js';
import { worlds, type GameView, type CharacterSummary, type Criterion, type Stats } from '../shared/game.js';
export class RequestError extends Error { constructor(public code:string,message:string){super(message);} }
export const readSaved=(key:string)=>{try{return localStorage.getItem('prjhex-ui:'+key);}catch{return null;}};
export const save=(key:string,value:string)=>{try{localStorage.setItem('prjhex-ui:'+key,value);}catch{}};
type Profile={id:string;name:string;aliases?:string[];image_url?:string;fields:Record<string,any>};
type Stored={view:GameView;target:string};
const cols=GAMES.onepiece.columns;
const criteria:Criterion[]=cols.map(c=>({key:c.key,label:c.label,kind:'text'}));
const summary=(c:Profile):CharacterSummary=>({id:c.id,name:c.name,aliases:c.aliases??[],imageUrl:c.image_url??null});
let pending:Promise<Profile[]>|undefined;
async function catalog(){
 if(!pending)pending=(async()=>{const response=await fetch(`${import.meta.env.BASE_URL}data/characters-full.json`);if(!response.ok)throw new RequestError('NETWORK','Не удалось загрузить каталог prjhex.');const data:unknown=await response.json();if(!Array.isArray(data))throw new Error('Неверный формат каталога');return data.filter(c=>typeof c.id==='string'&&typeof c.name==='string'&&c.fields) as Profile[];})().catch(e=>{pending=undefined;throw e;});
 return pending;
}
function stats():Stats{try{return JSON.parse(readSaved('stats')||'null')??{played:0,won:0,currentStreak:0,bestStreak:0};}catch{return {played:0,won:0,currentStreak:0,bestStreak:0};}}
function finish(won:boolean){const s=stats();s.played++;s.won+=Number(won);s.currentStreak=won?s.currentStreak+1:0;s.bestStreak=Math.max(s.bestStreak,s.currentStreak);save('stats',JSON.stringify(s));}
function store(g:Stored){save('game',JSON.stringify(g));return structuredClone(g.view);}
function active(id?:string):Stored{try{const g=JSON.parse(readSaved('game')||'null');if(!g||id&&g.view.id!==id)throw Error();return g;}catch{throw new RequestError('NOT_FOUND','Партия не найдена. Начните новую.');}}
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
 options.signal?.throwIfAborted();const data=await catalog();options.signal?.throwIfAborted();const url=new URL(path,'https://local.invalid');const body=options.body?JSON.parse(String(options.body)):{};let result:unknown;
 if(url.pathname==='/bootstrap') result={worlds:worlds.map(w=>w.id==='one-piece'?({...w,criteria}):w),coverage:[{worldId:'one-piece',catalog:data.length,playable:data.length,reviewed:0,drafts:0,importedWorks:0}],stats:stats(),draftMode:false};
 else if(url.pathname==='/characters'){const q=(url.searchParams.get('q')||'').trim().toLocaleLowerCase();result={characters:data.filter(c=>[c.name,...c.aliases??[]].some(n=>n.toLocaleLowerCase().includes(q))).slice(0,30).map(summary)};}
 else if(url.pathname==='/games'&&options.method==='POST'){
 if(body.worldId!=='one-piece')throw new RequestError('NO_PROFILES','Оформление Naruto доступно. Для игры нужно добавить каталог персонажей Naruto в этот проект.');
 if(!data.length)throw new RequestError('NO_PROFILES','Каталог пуст.');
 try{const old=active();if(old.view.status==='playing'){if(!body.restart)return structuredClone(old.view) as T;finish(false);}}catch(e){if(!(e instanceof RequestError))throw e;}
 const number=crypto.getRandomValues(new Uint32Array(1))[0];const target=data[Math.floor(number/4294967296*data.length)];result=store({target:target.id,view:{id:crypto.randomUUID(),worldId:'one-piece',status:'playing',guesses:[],draft:false,createdAt:new Date().toISOString(),criteria}});
 }else{
 const match=/^\/games\/([^/]+)(?:\/(guesses|hint|surrender))?$/.exec(url.pathname);if(!match)throw new RequestError('NOT_FOUND','Действие не найдено.');const g=active(decodeURIComponent(match[1]));const target=data.find(c=>c.id===g.target);if(!target)throw new RequestError('GAME_NEEDS_RESTART','Каталог обновлён. Начните новую партию.');
 if(match[2]){
 if(g.view.status!=='playing')throw new RequestError('GAME_FINISHED','Партия завершена.');
 const failed=g.view.guesses.filter(x=>!x.won).length;
 if(match[2]==='hint'){if(failed<5)throw new RequestError('HINT_LOCKED','Нужно 5 неверных попыток.');g.view.debutHint=formatField(cols[0],target.fields.first,true);}
 if(match[2]==='surrender'){if(failed<10)throw new RequestError('SURRENDER_LOCKED','Нужно 10 неверных попыток.');g.view.status='surrendered';g.view.answer=summary(target);finish(false);}
 if(match[2]==='guesses'){
 const c=data.find(c=>c.id===body.characterId);if(!c)throw new RequestError('NOT_FOUND','Персонаж не найден.');if(g.view.guesses.some(x=>x.character.id===c.id))throw new RequestError('DUPLICATE','Персонаж уже выбран.');
 const won=c.id===target.id;g.view.guesses.push({character:summary(c),won,cells:cols.map(col=>{const status=compareField(col,c,target);return {key:col.key,value:formatField(col,c.fields[col.key],true),match:status==='correct'?'correct':status==='close'?'partial':'wrong',...(status==='up'||status==='down'?{direction:status}:{})};})});if(won){g.view.status='won';finish(true);}g.view.debutHintAvailable=g.view.guesses.filter(x=>!x.won).length>=5;
 }
 } result=store(g);
 }return result as T;
}
