import { normalizeFairyTailDebut } from './fairy-tail-arcs.js';
import { normalizeFairyTailMagic } from './fairy-tail-magic.js';
import { currentGame, compareField, formatField, ICON, STATUS_TEXT } from './columns.js';
import { mskDate, msToMidnight, recordFirstAttempt, recordWin } from './stats.js';

const $ = s => document.querySelector(s);
const NEED = 3;                       // неверных попыток до разблокировки цитаты
const MAX = 30;                       // максимум попыток в день
const GAME = currentGame();
const COLS = GAME.columns;
const DATE = mskDate();               // день меняется в 00:00 по Москве
const KEY = 'animedle:state:' + DATE;
const norm = s => String(s).toLowerCase().trim();

let index = [], byId = new Map(), answer = null, quotes = {};
let state = { attempts: [], wrong: 0, solved: false, lost: false, quoteRevealed: false };
let selected = null;

const getJSON = async (u, opts) => {
  const r = await fetch(u, opts);
  if (!r.ok) throw new Error(`${u}: ${r.status}`);
  return r.json();
};

async function loadChars() {
  // s6 includes the debut arc and work metadata for Fairy Tail.
  const v = (await getJSON(`${GAME.dataDir}/version.json`, { cache: 'no-cache' })).version + ':s6';
  try {
    if (localStorage.getItem('animedle:characters-version') === v) {
      const c = localStorage.getItem('animedle:characters');
      if (c) return JSON.parse(c);
    }
  } catch {}
  // url / raw игре не нужны — не тащим их в память и кэш
  const data = (await getJSON(`${GAME.dataDir}/characters-full.json`))
    .map(({ id, name, image_url, fields }) => ({ id, name, image_url, fields }))
    .map(profile => GAME.dataDir === 'dataft' ? normalizeFairyTailDebut(normalizeFairyTailMagic(profile)) : profile);
  try {
    localStorage.setItem('animedle:characters', JSON.stringify(data));
    localStorage.setItem('animedle:characters-version', v);
  } catch {}
  return data;
}

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

// ---------- таблица ----------
// Fandom умеет отдавать уменьшенные картинки — берём маленькие, а не оригиналы.
function thumb(u, w) {
  return u.includes('/revision/latest') && !u.includes('/scale-to-width')
    ? u.replace('/revision/latest', `/revision/latest/scale-to-width-down/${w}`) : u;
}

function buildHead() {
  const tr = $('#thead-row');
  tr.closest('table').style.setProperty('--cols', COLS.length + 1);
  ['Персонаж', ...COLS.map(c => c.label)].forEach(t => {
    const th = document.createElement('th');
    th.scope = 'col'; th.textContent = t; tr.append(th);
  });
}

function addRow(att) {
  const g = byId.get(att.characterId);
  const tr = document.createElement('tr');
  const th = document.createElement('th');
  th.scope = 'row';
  if (g?.image_url) {
    const url = thumb(g.image_url, 200).replace(/"/g, '%22');
    th.style.backgroundImage = `linear-gradient(to top,rgba(0,0,0,.85),rgba(0,0,0,.1)),url("${url}")`;
  }
  th.append(Object.assign(document.createElement('span'), { textContent: att.name }));
  tr.append(th);
  COLS.forEach(c => {
    const st = att.statuses[c.key];
    const val = g ? formatField(c, g.fields?.[c.key]) : '—';
    const full = g ? formatField(c, g.fields?.[c.key], true) : '—';
    const td = document.createElement('td');
    td.dataset.status = st;
    td.title = `${full}: ${STATUS_TEXT[st]}`;
    const ico = Object.assign(document.createElement('span'), { className: 'ico', textContent: ICON[st] });
    ico.setAttribute('aria-hidden', 'true');
    const v = Object.assign(document.createElement('span'), { className: 'val', textContent: val });
    const sr = Object.assign(document.createElement('span'), { className: 'sr-only', textContent: ' — ' + STATUS_TEXT[st] });
    td.append(ico, v, sr);
    tr.append(td);
  });
  $('#tbody').prepend(tr);
}

// ---------- UI ----------
function updateUI() {
  $('#wrong-n').textContent = state.wrong;
  $('#attempts-n').textContent = `${state.attempts.length} из ${MAX}`;
  const unlocked = state.wrong >= NEED || state.quoteRevealed;
  $('#quote-btn').disabled = !unlocked || state.quoteRevealed;
  $('#quote-locked').hidden = state.quoteRevealed;
  $('#wrong-counter').hidden = state.quoteRevealed;
  $('#quote-btn').hidden = state.quoteRevealed;
  const q = $('#quote-text');
  q.hidden = !state.quoteRevealed;
  if (state.quoteRevealed) q.textContent = quotes[answer?.id] || 'Цитата недоступна';
  $('#win').hidden = !state.solved;
  $('#guess-input').disabled = $('#guess-btn').disabled = state.solved || state.lost || !answer;
  $('#lose').hidden = !(state.lost && answer);
  if (state.lost && answer) {
    $('#lose-name').textContent = answer.name;
    const im = $('#lose-img');
    im.hidden = !answer.image_url;
    if (answer.image_url) im.src = thumb(answer.image_url, 96);
  }
  if (state.solved) $('#win-name').textContent = answer.name;
  if (state.solved || state.lost) startCountdown();
}

let timer;
function startCountdown() {
  clearInterval(timer);
  const tick = () => {
    const ms = msToMidnight();
    if (ms <= 1000) return location.reload();
    const p = x => String(x).padStart(2, '0');
    const s = Math.floor(ms / 1000);
    const t = `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
    document.querySelectorAll('.countdown').forEach(el => { el.textContent = t; });
  };
  tick(); timer = setInterval(tick, 1000);
}

const setError = m => { $('#form-error').textContent = m; };

// ---------- автокомплит ----------
const input = $('#guess-input'), list = $('#ac-list');
let items = [], active = -1;

function closeList() {
  list.hidden = true; active = -1; items = [];
  input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
}
function setActive(i) {
  active = i;
  [...list.children].forEach((li, k) => li.setAttribute('aria-selected', k === i));
  if (i >= 0) { input.setAttribute('aria-activedescendant', 'ac-' + i); list.children[i].scrollIntoView({ block: 'nearest' }); }
}
function setSelected(c) {
  selected = c;
  const ico = $('#sel-ico'), url = c && byId.get(c.id)?.image_url;
  ico.hidden = !url;
  $('.ac-wrap').classList.toggle('has-ico', !!url);
  if (url) ico.src = thumb(url, 64);
}
function pick(c) { setSelected(c); input.value = c.name; closeList(); input.focus(); }

// Чем меньше число, тем выше в списке: начало имени → начало алиаса → начало слова → вхождение.
function rank(c, q) {
  const n = norm(c.name), al = (c.aliases || []).map(norm);
  if (n.startsWith(q)) return 0;
  if (al.some(a => a.startsWith(q))) return 1;
  if (n.split(/\s+/).some(w => w.startsWith(q))) return 2;
  if (n.includes(q)) return 3;
  return al.some(a => a.includes(q)) ? 4 : 9;
}

input.addEventListener('input', () => {
  setSelected(null); setError('');
  const q = norm(input.value);
  if (!q) return closeList();
  items = index.map(c => [rank(c, q), c]).filter(([r]) => r < 9)
    .sort((a, b) => a[0] - b[0]).slice(0, 10).map(([, c]) => c);
  if (!items.length) return closeList();
  list.replaceChildren(...items.map((c, i) => {
    const li = document.createElement('li');
    li.id = 'ac-' + i; li.setAttribute('role', 'option');
    const url = byId.get(c.id)?.image_url;
    if (url) {
      const im = new Image();
      im.src = thumb(url, 64); im.alt = ''; im.loading = 'lazy'; im.referrerPolicy = 'no-referrer';
      li.append(im);
    }
    li.append(Object.assign(document.createElement('span'), { textContent: c.name }));
    li.addEventListener('mousedown', e => e.preventDefault());
    li.addEventListener('click', () => pick(c));
    return li;
  }));
  list.hidden = false; input.setAttribute('aria-expanded', 'true'); setActive(-1);
});
input.addEventListener('keydown', e => {
  if (list.hidden) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); setActive((active + 1) % items.length); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((active - 1 + items.length) % items.length); }
  else if (e.key === 'Enter') { e.preventDefault(); pick(items[active >= 0 ? active : 0]); }
  else if (e.key === 'Escape') { e.stopPropagation(); closeList(); }
});
document.addEventListener('click', e => { if (!e.target.closest('.ac-wrap')) closeList(); });

// ---------- попытка ----------
$('#guess-form').addEventListener('submit', e => {
  e.preventDefault();
  if (state.solved || state.lost || !answer) return;
  let c = selected;
  if (!c) {
    const q = norm(input.value);
    c = index.find(x => norm(x.name) === q || (x.aliases || []).some(a => norm(a) === q));
  }
  if (!c) return setError('Выбери персонажа из списка.');
  if (state.attempts.some(a => a.characterId === c.id)) return setError('Этого персонажа ты уже вводил.');
  const g = byId.get(c.id);
  if (!g) return setError('Для этого персонажа нет данных.');

  const statuses = Object.fromEntries(COLS.map(col => [col.key, compareField(col, g, answer)]));
  const att = { characterId: c.id, name: g.name, statuses };
  if (!state.attempts.length) recordFirstAttempt();
  state.attempts.push(att);

  if (g.id === answer.id) {
    state.solved = true; state.quoteRevealed = true;
    recordWin(state.attempts.length, DATE);
  } else {
    state.wrong++;
    if (state.attempts.length >= MAX) { state.lost = true; state.quoteRevealed = true; }
  }

  save(); addRow(att); updateUI();
  input.value = ''; setSelected(null); setError('');
  if (!state.solved && !state.lost) input.focus();
});

$('#quote-btn').addEventListener('click', () => {
  if (state.wrong < NEED) return;
  state.quoteRevealed = true; save(); updateUI();
});

// ---------- старт ----------
async function init() {
  $('#wrong-need').textContent = NEED;
  buildHead();
  try {
    const [idx, daily, full, q] = await Promise.all([
      getJSON(`${GAME.dataDir}/characters-index.json`),
      getJSON(`${GAME.dataDir}/daily.json`),
      loadChars(),
      getJSON(`${GAME.dataDir}/quotes.json`).catch(() => ({})),
    ]);
    index = idx; quotes = q; byId = new Map(full.map(c => [c.id, c]));
    answer = byId.get(daily[DATE]) || null;
    if (!answer) setError('На сегодня персонаж не назначен. Загляни позже.');
  } catch (err) {
    console.error(err);
    setError('Не удалось загрузить данные. Обнови страницу.');
  }
  try { state = { ...state, ...JSON.parse(localStorage.getItem(KEY)) }; } catch {}
  [...state.attempts].forEach(addRow);   // prepend: последняя попытка окажется сверху
  updateUI();
}
init();