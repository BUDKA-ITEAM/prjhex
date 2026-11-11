import type { TraitValue } from '../shared/game.js';
const elements:Record<string,{symbol:string;color:string}>={
 'Вода':{symbol:'水',color:'#59b8ee'},'Огонь':{symbol:'火',color:'#ee704c'},'Ветер':{symbol:'風',color:'#a7de9e'},
 'Земля':{symbol:'土',color:'#c49a68'},'Дерево':{symbol:'木',color:'#5eaf74'},'Молния':{symbol:'雷',color:'#e6d52b'},
};
export function NatureIcons({value}:{value:TraitValue}){
 if(!Array.isArray(value)||!value.length)return null;
 return <span className="nature-icons" role="list" aria-label="Стихии">{value.map(name=>{
  const element=elements[name];
  return <span className="nature-icon" role="listitem" key={name} title={name}>{element?<svg viewBox="0 0 100 100" role="img" aria-label={name}>
   <polygon points="29,2 71,2 98,29 98,71 71,98 29,98 2,71 2,29" fill="#111"/>
   <polygon points="31,8 69,8 92,31 92,69 69,92 31,92 8,69 8,31" fill={element.color}/>
   <path d="M31 8H69L92 31" fill="none" stroke="#fff" strokeOpacity=".38" strokeWidth="3"/>
   <text x="50" y="53" dominantBaseline="middle" textAnchor="middle" fill="#10120c" fontSize="66" fontWeight="900" fontFamily="Yu Gothic,Meiryo,Microsoft YaHei,serif">{element.symbol}</text>
  </svg>:<span className="nature-fallback">{name}</span>}</span>;
 })}</span>;
}
