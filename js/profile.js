import { loadStats, activeStreak } from './stats.js';

const s = loadStats();
const set = (id, v) => { document.getElementById(id).textContent = v; };
set('st-played', s.played);
set('st-wins', s.wins);
set('st-rate', (s.played ? Math.round((s.wins / s.played) * 100) : 0) + '%');
set('st-streak', activeStreak(s));
set('st-best', s.best);

const max = Math.max(1, ...s.dist);
document.getElementById('dist').replaceChildren(...s.dist.map((n, i) => {
  const row = document.createElement('div');
  const label = Object.assign(document.createElement('span'), { textContent: i === 5 ? '6+' : i + 1 });
  const bar = Object.assign(document.createElement('div'), { className: 'bar', textContent: n });
  bar.style.width = Math.max(8, (n / max) * 100) + '%';
  bar.setAttribute('role', 'img');
  bar.setAttribute('aria-label', `${i === 5 ? '6 и больше' : i + 1} попыт.: ${n}`);
  row.append(label, bar);
  return row;
}));