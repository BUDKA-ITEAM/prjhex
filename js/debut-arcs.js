import onePieceArcs from '../shared/onepiece-arcs.json';
import debutMetadata from '../shared/naruto-debuts.json';
import catalog from '../shared/naruto-arcs.json';
const translations={
 'Prologue — Land of Waves':'Пролог — Страна Волн','Chūnin Exams':'Экзамен на тюнина','Konoha Crush':'Разрушение Конохи','Search for Tsunade':'Поиски Цунаде','Sasuke Recovery Mission':'Возвращение Саске','Kazekage Rescue Mission':'Спасение Казекаге','Tenchi Bridge Reconnaissance Mission':'Разведка у моста Тэнти','Akatsuki Suppression Mission':'Миссия по пресечению действий Акацуки','Itachi Pursuit Mission':'Преследование Итачи','Tale of Jiraiya the Gallant':'История отважного Дзирайи','Fated Battle Between Brothers':'Битва братьев','Pain’s Assault':'Нападение Пейна',"Pain's Assault":'Нападение Пейна','Five Kage Summit':'Совет пяти Каге','Fourth Shinobi World War: Countdown':'Четвёртая мировая война шиноби: Обратный отсчёт','Fourth Shinobi World War: Confrontation':'Четвёртая мировая война шиноби: Противостояние','Fourth Shinobi World War: Climax':'Четвёртая мировая война шиноби: Кульминация',"Birth of the Ten-Tails' Jinchūriki":'Рождение джинчурики Десятихвостого','Kaguya Ōtsutsuki Strikes':'Нападение Кагуи Ооцуцуки',
};

export function normalizeDebut(profile,world){
 const fields=profile.fields;const first=fields.debut??fields.first??{};
 const explicit=first.arc??fields.debut_arc;let arc=typeof explicit==='string'&&explicit.trim()?explicit.trim():null;
 if(!arc&&world==='naruto'){
 const recovered=debutMetadata[profile.id+':'+Number(first.episode)]??debutMetadata[profile.id];
 const reference=String(first.series??first.anime??(recovered?.episode===Number(first.episode)?recovered.series:profile.raw?.debut??'')).toLowerCase();
 const series=/boruto/.test(reference)?'boruto':/shipp[uū]den/.test(reference)?'shippuden':/naruto/.test(reference)?'naruto':null;
 if(series){const episode=Number(first.episode);const match=catalog.arcs.find(a=>a.series===series&&a.episodes.some(([start,end])=>episode>=start&&episode<=end));if(match)arc=translations[match.name]??match.name;}
 }
 if(!arc&&world==='one-piece'){const episode=Number(first.episode);arc=onePieceArcs.arcs.find(a=>episode>=a.start&&episode<=a.end)?.name??null;}
 return {...profile,fields:{...fields,first:{...first,arc}}};
}
