export function debutEpisode(first) { const raw=first?.episode; const value=typeof raw==='number'?raw:typeof raw==='string'&&/^\d+$/.test(raw.trim())?Number(raw):NaN; return Number.isSafeInteger(value)&&value>0?value:null; }

export const ICON = { correct: '✔', close: '≈', wrong: '✖', up: '↑', down: '↓' };
export const STATUS_TEXT = {
  correct: 'совпало', close: 'близко', wrong: 'не совпало',
  up: 'искомое значение больше', down: 'искомое значение меньше',
};

const n = v => String(v).trim().toLowerCase();
const values = v => Array.isArray(v) ? v : typeof v === 'string' && v.trim() ? [v.trim()] : [];
const arr = v => values(v).map(n);
const empty = v => v == null || (Array.isArray(v) && !v.length);
const cap = s => (s ? String(s)[0].toUpperCase() + String(s).slice(1) : s);

const TYPES = {
 episode: {
  format:v=>debutEpisode(v)===null?'Не указано':'Серия '+debutEpisode(v),
  compare(g,a){const x=debutEpisode(g),y=debutEpisode(a);return x===y?'correct':x===null||y===null?'wrong':x<y?'up':'down';}
 },
  appearance: {
    format: v => typeof v?.arc==='string' && v.arc.trim() ? v.arc : 'Арка не указана',
    compare(g, a) {
      const left=debutEpisode(g),right=debutEpisode(a);
      if(left===null||right===null)return 'wrong';
      return left===right?'correct':left<right?'up':'down';
    },
  },
  list: {
    format: (v, o, full) => (empty(v) ? '—' : (full || !o.limit ? values(v) : values(v).slice(0, o.limit)).map(cap).join(', ')),
    compare(g, a) {
      if (empty(g) && empty(a)) return 'correct';
      if (empty(g) || empty(a)) return 'wrong';
      const G = new Set(arr(g)), A = new Set(arr(a));
      const common = [...G].filter(x => A.has(x)).length;
      return common === G.size && common === A.size ? 'correct' : common ? 'close' : 'wrong';
    },
  },
  region: {
    format: v => (v?.region ? cap(v.region) + (v.detail ? ` / ${cap(v.detail)}` : '') : '—'),
    compare(g, a) {
      if (!g && !a) return 'correct';
      if (!g || !a || n(g.region) !== n(a.region)) return 'wrong';
      return n(g.detail ?? '') === n(a.detail ?? '') ? 'correct' : 'close';
    },
  },
  enum: {
    format: v => (v == null || v === '' ? '—' : String(v)),
    compare: (g, a) => ((g == null && a == null) || (g != null && a != null && n(g) === n(a)) ? 'correct' : 'wrong'),
  },
  number: {
    format: (v, o) => (v == null ? '—' : v.toLocaleString('ru-RU') + (o.suffix ?? '')),
    compare(g, a, o) {
      if (g == null && a == null) return 'correct';
      if (g == null || a == null) return 'wrong';
      if (g === a) return 'correct';
      const diff = Math.abs(a - g);
      const close = o.tolerancePercent != null ? a !== 0 && diff / Math.abs(a) <= o.tolerancePercent / 100
        : diff <= (o.tolerance ?? 0);
      return close ? 'close' : a > g ? 'up' : 'down';
    },
  },
};

export const GAMES = {
 ft:{name:'Fairy Tail',title:'AnimeDle — Fairy Tail',dataDir:'dataft',columns:[
 {key:'gender',label:'Пол',type:'enum'},{key:'affiliation',label:'Гильдия',type:'list'},
 {key:'occupation',label:'Занятие',type:'list'},{key:'magic',label:'Магия',type:'list'},
 {key:'debut',label:'Первое появление',type:'episode'}]},
 ps:{name:'Prison School',title:'AnimeDle — Prison School',dataDir:'dataps',columns:[
 {key:'gender',label:'Пол',type:'enum'},{key:'hair_color',label:'Цвет волос',type:'enum'},
 {key:'school',label:'Школа',type:'list'},{key:'occupation',label:'Занятие',type:'list'}]},
  // ДХД
 dxd:{name:'High School DxD',title:'AnimeDle — High School DxD',dataDir:'datadxd',columns:[
 {key:'race',label:'Раса',type:'list'},{key:'hair',label:'Цвет волос',type:'enum'},
 {key:'equipment',label:'Снаряжение / способности',type:'list'},{key:'status',label:'Статус',type:'enum'},{key:'ranking',label:'Ранг',type:'enum'}]},
//  ТАНКИ
 gup:{name:'Girls und Panzer',title:'AnimeDle — Girls und Panzer',dataDir:'datagup',columns:[
 {key:'height',label:'Рост',type:'number',tolerance:5,suffix:' см'},{key:'affiliation',label:'Школа / принадлежность',type:'list'},
 {key:'team',label:'Команда',type:'list'},{key:'role',label:'Роль',type:'list'},{key:'tank',label:'Танк',type:'list'}]},
  // НАРУТО 
 naruto: {name:'Naruto',title:'AnimeDle — Naruto',dataDir:'datanar',columns:[
    {key:'gender',label:'Пол',type:'enum'},
    {key:'affiliation',label:'Аффилиации',type:'list'},
    {key:'clan',label:'Клан',type:'list'},
    {key:'attributes',label:'Атрибуты',type:'list'},
    {key:'kekkei_genkai',label:'Kekkei Genkai',type:'list'},
    {key:'nature_type',label:'Виды природы',type:'list'},
    {key:'first',label:'Арка дебюта',type:'appearance'}
  ]},
  // ВАНПИС
  onepiece: {
    name: 'One Piece',
    title: 'AnimeDle — One Piece',
    dataDir: 'dataop',
    columns: [
      { key: 'age', label: 'Возраст', type: 'number', tolerance: 5 },
      { key: 'haki', label: 'Хаки', type: 'list' },
      { key: 'occupation', label: 'Занятие', type: 'list', limit: 2 },
      { key: 'affiliation', label: 'Принадлежность', type: 'list', limit: 2 },
      { key: 'dftype', label: 'Фрукт', type: 'enum' },
      { key: 'bounty', label: 'Награда', type: 'number', tolerancePercent: 10, suffix: ' ฿' },
      { key: 'origin', label: 'Происхождение', type: 'region' },
      { key: 'first', label: 'Арка дебюта', type: 'appearance' },
    ],
  },
};

export const currentGame = () =>
  GAMES[new URLSearchParams(location.search).get('game')] || GAMES.onepiece;

export const compareField = (col, guess, answer) =>
  TYPES[col.type].compare(guess.fields?.[col.key], answer.fields?.[col.key], col);
export const formatField = (col, value, full = false) => TYPES[col.type].format(value, col, full);
export function numericDirection(guessed, target) {
 if(typeof guessed!=='number'||typeof target!=='number'||!Number.isFinite(guessed)||!Number.isFinite(target)||guessed===target)return undefined;
 return target>guessed?'up':'down';
}

// добавить новый мир нужно создать для него папку положить туда characters-full.json, в columns.js указать путь к папке и 
// описать критерии персонажей по структуре жсона после зарегистрировать мир в configuration() файла src/api.ts добавить его 
// в список миров интерфейса и включить папку с данными в сборку через vite.config.ts. Общий fetch автоматически загрузит данные по 
// заданному пути