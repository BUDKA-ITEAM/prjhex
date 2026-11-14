export const fairyTailArcs = [
  ['Макао',1,2,1,3],
  ['Рассвет',3,4,4,9],
  ['Эйзенвальд',5,10,10,23],
  ['Остров Галуна',11,20,24,46],
  ['Фантом Лорд',21,30,47,69],
  ['Локи',31,32,70,74],
  ['Райская башня',33,40,75,102],
  ['Битва за Хвост Феи',41,51,103,130],
  ['Орасьон Сейс',52,68,131,164],
  ['Дафна',69,75,null,null],
  ['Эдолас',76,95,165,199],
  ['Остров Тенрю',96,122,200,253],
  ['791 год',123,124,254,257],
  ['Ключ звёздного неба',125,150,null,null],
  ['Великие магические игры',151,203,258,340],
  ['Затмение звёздных духов',204,226,null,null],
  ['Деревня Солнца',227,233,341,355],
  ['Тартарос',234,265,356,417],
  ['Хвост Феи: Начало',266,275,null,null],
  ['Аватар',276,284,418,437],
  ['Империя Альварес',285,328,438,545],
].map(([name,start,end,chapterStart,chapterEnd],order)=>({name,start,end,chapterStart,chapterEnd,order,series:'fairy-tail'}));

export const fairyTailQuestArcs = [
  ['Бог-дракон Воды',1,7,1,24],
  ['Бог-дракон Древа',8,18,25,63],
  ['Бог-дракон Луны',19,25,64,90],
  ['Великий лабиринт',null,null,91,122],
  ['Золотая Сова',null,null,123,153],
  ['Истинный фестиваль Короля драконов',null,null,154,203],
].map(([name,start,end,chapterStart,chapterEnd],order)=>({name:'Столетний квест: '+name,start,end,chapterStart,chapterEnd,order:21+order,series:'100-years-quest'}));

const questCharacters = new Set(`
Aldoron Alta_Face Asuka_(Edolas) Athena Athena_II Bappy Bestia Biby Bird Blade Bobo Brian Cara Charlotte
Chief_of_the_White_Shrine_Maidens Daemon Dogramag Doom Duke_Barbaroa_(Concept) Elbman Elefseria Elkis
Ennie_Signario Elexion Faris Faris_(Earth_Land) Faris_(Edolas) Gaia Gate Gazeel Gears Gennai Georg_Reizen
Greige Gren Haku Hakune Ignia Informant_of_Filan Irene_(Edolas) Iruha Iruzala Iwashita Jellal's_Mother
Juvina Karameel Kashima Kiria Kirin Kotetsu Krov Kurnugi Laxlis Lecka Leiji Lijy Lisala Lulu Lusha
Luso_Signario Madmole Mercphobia Metro Mimi Minajane Misaki Misfortune Moka Nakku Nasha Nebaru
Raj Rocky Sai Selene Shade_(Character) Sharkette Sharkina Skullion_Raider Suzaku Tablin Tatsuya
Touka Viernes Water_God's_Messenger Wed Wendelle Wolfen Wraith Yelena Yoko Zalam
`.trim().split(/\s+/));

const positive = value => Number.isSafeInteger(Number(value)) && Number(value)>0 ? Number(value) : null;

export function normalizeFairyTailDebut(profile) {
  const debut = profile.fields?.debut;
  if (!debut || typeof debut !== 'object') return profile;
  const explicitSeries=String(debut.series ?? debut.anime ?? '').toLowerCase();
  const quest=explicitSeries ? /100|quest|столет/.test(explicitSeries) : questCharacters.has(profile.id);
  const arcs=quest ? fairyTailQuestArcs : fairyTailArcs;
  const episode=positive(debut.episode),chapter=positive(debut.chapter);
  const arc=episode!==null
    ? arcs.find(arc=>arc.start!==null && episode>=arc.start && episode<=arc.end)
    : chapter!==null ? arcs.find(arc=>arc.chapterStart!==null && chapter>=arc.chapterStart && chapter<=arc.chapterEnd) : undefined;
  return {...profile,fields:{...profile.fields,debut:{...debut,arc:arc?.name??null,arcOrder:arc?.order??null,series:quest?'100-years-quest':'fairy-tail'}}};
}
