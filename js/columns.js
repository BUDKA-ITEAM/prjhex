// Колонки и компараторы. Для другой франшизы — добавь запись в GAMES
// (и папку data/<game>/); game.js ничего про конкретные поля не знает.

export const ICON = { correct: '✔', close: '≈', wrong: '✖', up: '↑', down: '↓' };
export const STATUS_TEXT = {
  correct: 'совпало', close: 'близко', wrong: 'не совпало',
  up: 'искомое значение больше', down: 'искомое значение меньше',
};

const n = v => String(v).trim().toLowerCase();
const arr = v => (Array.isArray(v) ? v : []).map(n);
const empty = v => v == null || (Array.isArray(v) && !v.length);
const cap = s => (s ? String(s)[0].toUpperCase() + String(s).slice(1) : s);

const TYPES = {
  // Дебют: глава в приоритете, иначе эпизод.
  appearance: {
    format: v => (v?.chapter != null ? `гл. ${v.chapter}` : v?.episode != null ? `эп. ${v.episode}` : '—'),
    compare(g, a, o) {
      const pair = g?.chapter != null && a?.chapter != null ? [g.chapter, a.chapter]
        : g?.episode != null && a?.episode != null ? [g.episode, a.episode] : null;
      if (!pair) return g?.chapter == null && g?.episode == null && a?.chapter == null && a?.episode == null ? 'correct' : 'wrong';
      const d = Math.abs(pair[0] - pair[1]);
      return d === 0 ? 'correct' : d <= (o.close ?? 20) ? 'close' : 'wrong';
    },
  },
  // Списки: полное совпадение набора — correct, хотя бы один общий элемент — close.
  list: {
    // в ячейке — первые o.limit значений, полный список (full) — в подсказке
    format: (v, o, full) => (empty(v) ? '—' : (full || !o.limit ? v : v.slice(0, o.limit)).map(cap).join(', ')),
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
  // Числа: стрелка показывает, куда двигаться (↑ — искомое больше).
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
  naruto: {name:'Naruto',title:'AnimeDle — Naruto',dataDir:'datanar',columns:[
    {key:'gender',label:'Пол',type:'enum'},
    {key:'affiliation',label:'Аффилиации',type:'list'},
    {key:'clan',label:'Клан',type:'list'},
    {key:'attributes',label:'Атрибуты',type:'list'},
    {key:'kekkei_genkai',label:'Kekkei Genkai',type:'list'},
    {key:'nature_type',label:'Виды природы',type:'list'},
    {key:'debut_arc',label:'Дебютная арка',type:'enum'}
  ]},
  onepiece: {
    name: 'One Piece',
    title: 'AnimeDle — One Piece',
    dataDir: 'dataop',
    columns: [
      { key: 'first', label: 'Дебют', type: 'appearance', close: 20 },
      { key: 'affiliation', label: 'Принадлежность', type: 'list', limit: 2 },
      { key: 'occupation', label: 'Занятие', type: 'list', limit: 2 },
      { key: 'origin', label: 'Происхождение', type: 'region' },
      { key: 'status', label: 'Статус', type: 'enum' },
      { key: 'age', label: 'Возраст', type: 'number', tolerance: 5 },
      { key: 'bounty', label: 'Награда', type: 'number', tolerancePercent: 10, suffix: ' ฿' },
      { key: 'dftype', label: 'Тип фрукта', type: 'enum' },
    ],
  },
};

export const currentGame = () =>
  GAMES[new URLSearchParams(location.search).get('game')] || GAMES.onepiece;

export const compareField = (col, guess, answer) =>
  TYPES[col.type].compare(guess.fields?.[col.key], answer.fields?.[col.key], col);
export const formatField = (col, value, full = false) => TYPES[col.type].format(value, col, full);