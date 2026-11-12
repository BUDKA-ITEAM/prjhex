export type TraitValue = string | number | string[] | null;
export type Traits = Record<string, TraitValue>;
export type Criterion = { key: string; label: string; kind: 'text' | 'number' | 'set'; unit?: string; unknownCategory?: boolean };
export type FranchiseId = 'one-piece' | 'naruto' | 'fairy-tail' | 'dxd' | 'girls-und-panzer';
export interface World {
  id: FranchiseId; name: string; title: string; japanese: string; subtitle: string;
  symbol: string; accent: string; criteria: Criterion[];
}
const gender: Criterion = { key: 'gender', label: 'Пол', kind: 'text' };
const species: Criterion = { key: 'species', label: 'Раса', kind: 'text' };
export const biographicalCriteria: Criterion[] = [
  { key: 'age', label: 'Возраст', kind: 'number', unit: 'лет' },
  { key: 'height', label: 'Рост', kind: 'number', unit: 'см' },
  { key: 'debut', label: 'Первое появление', kind: 'text' },
];
const allWorlds: World[] = [
  { id: 'one-piece', name: 'Ван-Пис', title: 'ONE PIECE', japanese: 'ワンピース', subtitle: 'Найди своего героя на Гранд-Лайн', symbol: '01', accent: '#b5a0ff', criteria: [gender, species,
    { key: 'faction', label: 'Принадлежность', kind: 'set' }, { key: 'fruit', label: 'Тип плода', kind: 'text' },
    { key: 'haki', label: 'Хаки', kind: 'set' }, { key: 'bounty', label: 'Награда', kind: 'number', unit: '฿' }] },
  { id: 'naruto', name: 'Наруто', title: 'NARUTO', japanese: 'ナルト', subtitle: 'Кто скрывается за повязкой шиноби?', symbol: '02', accent: '#ffb77b', criteria: [gender,
    { key: 'village', label: 'Принадлежность', kind: 'set' },
    { key: 'clan', label: 'Клан', kind: 'set' },
    { key: 'jutsu', label: 'Виды дзюцу', kind: 'set' },
    { key: 'kekkei', label: 'Кэккэй гэнкай', kind: 'set' },
    { key: 'nature', label: 'Стихии', kind: 'set' },
    { key: 'attributes', label: 'Атрибуты', kind: 'set' },
    { key: 'debut', label: 'Первое появление', kind: 'text' }] },  { id: 'fairy-tail', name: 'Хвост феи', title: 'FAIRY TAIL', japanese: 'フェアリーテイル', subtitle: 'Узнай мага по следам его магии', symbol: '03', accent: '#f29bc1', criteria: [gender, species,
    { key: 'guild', label: 'Принадлежность', kind: 'set' }, { key: 'magic', label: 'Магия', kind: 'set' },
    { key: 'slayer', label: 'Убийца', kind: 'text' }, { key: 'origin', label: 'Происхождение', kind: 'text' }] },
  { id: 'dxd', name: 'High School DxD', title: 'HIGH SCHOOL DxD', japanese: 'ハイスクールD×D', subtitle: 'Загадка клуба оккультных исследований', symbol: '04', accent: '#f18d91', criteria: [gender, species,
    { key: 'faction', label: 'Сторона', kind: 'set' }, { key: 'peerage', label: 'Свита', kind: 'text' },
    { key: 'piece', label: 'Фигура', kind: 'text' }, { key: 'gear', label: 'Святой механизм', kind: 'text' }] },
  { id: 'girls-und-panzer', name: 'Девушки и танки', title: 'GIRLS UND PANZER', japanese: 'ガールズ＆パンツァー', subtitle: 'Кто сегодня выйдет на поле сэнся-до?', symbol: '05', accent: '#97cfb1', criteria: [gender,
    { key: 'school', label: 'Школа', kind: 'text' }, { key: 'team', label: 'Экипаж', kind: 'text' },
    { key: 'position', label: 'Роль в танке', kind: 'text' }, { key: 'tank', label: 'Танк', kind: 'text' },
    { key: 'schoolYear', label: 'Год обучения', kind: 'number' }] },
];
export const worlds = allWorlds.filter(w=>w.id === 'one-piece' || w.id === 'naruto');
for (const world of worlds) {
  if(world.id==='naruto')world.criteria=world.criteria.map(c=>({...c,unknownCategory:true}));
  else world.criteria = [...world.criteria, ...biographicalCriteria];
}
export function legacyCriteria(id: string): Criterion[] {
 if(id!=='naruto')return worldById(id).criteria.filter(c=>!['age','height','debut'].includes(c.key));
 return [gender,{key:'village',label:'Деревня / сторона',kind:'set'},{key:'clan',label:'Клан',kind:'text'},{key:'nature',label:'Стихии',kind:'set'},{key:'rank',label:'Ранг',kind:'text'},{key:'kekkei',label:'Кэккэй гэнкай',kind:'set'}];
}
export interface CharacterSummary {
  id: string; name: string; aliases: string[]; imageUrl: string | null;
  referenceKind?: 'anime' | 'manga'; referenceLabel?: string;
  sources?: { url: string; note: string; checkedAt: string }[];
}
export type Match = 'correct' | 'partial' | 'wrong' | 'unknown';
export interface Cell { key: string; value: TraitValue; match: Match; direction?: 'up' | 'down'; note?: string }
export interface Guess { character: CharacterSummary; cells: Cell[]; won: boolean }
export interface GameView {
  id: string; worldId: FranchiseId; status: 'playing' | 'won' | 'abandoned' | 'surrendered';
  guesses: Guess[]; draft: boolean; createdAt: string;
  criteria: Criterion[];
  answer?: CharacterSummary;
  debutHint?: string;
  debutHintAvailable?: boolean;
}
export interface WorldCoverage { worldId: FranchiseId; catalog: number; playable: number; reviewed: number; drafts: number; importedWorks: number; wikiPages?:number;wikiImported?:number;wikiFailed?:number }
export interface Stats { played: number; won: number; currentStreak: number; bestStreak: number }
export interface Bootstrap { worlds: World[]; coverage: WorldCoverage[]; stats: Stats; draftMode: boolean }
export interface ApiError { error: { code: string; message: string } }
export function worldById(id: string): World { const world = worlds.find(w => w.id === id); if (!world) throw new Error('Unknown world'); return world; }




