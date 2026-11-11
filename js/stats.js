// Время по Москве (UTC+3, без DST) и статистика игрока в localStorage.
const KEY = 'animedle:stats';
const DAY = 864e5;

const mskNow = () => new Date(Date.now() + 3 * 36e5);
export const mskDate = () => mskNow().toISOString().slice(0, 10);
export const shiftDay = (date, d) => new Date(Date.parse(date) + d * DAY).toISOString().slice(0, 10);
export const msToMidnight = () => {
  const m = mskNow();
  return Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate() + 1) - m.getTime();
};

const blank = () => ({ played: 0, wins: 0, streak: 0, best: 0, lastWin: null, dist: [0, 0, 0, 0, 0, 0] });

export function loadStats() {
  try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return blank(); }
}
const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };

export function recordFirstAttempt() {
  const s = loadStats(); s.played++; save(s);
}

export function recordWin(attempts, date) {
  const s = loadStats();
  s.wins++;
  s.dist[Math.min(attempts, 6) - 1]++;
  s.streak = s.lastWin === shiftDay(date, -1) ? s.streak + 1 : 1;
  s.best = Math.max(s.best, s.streak);
  s.lastWin = date;
  save(s);
}

// Серия сгорает, если вчера не было победы и сегодня тоже ещё нет.
export function activeStreak(s, today = mskDate()) {
  return s.lastWin === today || s.lastWin === shiftDay(today, -1) ? s.streak : 0;
}