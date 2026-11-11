// Общий хедер, боковое меню, футер и модалка. Подключается на каждой странице.
const REPO = 'https://github.com/chikichumba/prjhex';
import { GAMES } from './columns.js';
const PAGES = [['how-to-play.html', 'Как играть'], ['profile.html', 'Профиль']];
const gameKey = new URLSearchParams(location.search).get('game') || Object.keys(GAMES)[0];
const cur = location.pathname.split('/').pop() || 'index.html';

document.body.insertAdjacentHTML('afterbegin', `
<header class="site-header">
  <button id="burger" class="burger" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="side-menu"><span></span><span></span><span></span></button>
  <a class="logo" href="index.html" aria-hidden="true" tabindex="-1"></a>
</header>
<div id="backdrop" class="backdrop" hidden></div>
<nav id="side-menu" class="side-menu" aria-label="Главное меню" hidden>
  <p class="menu-title">Играть</p>
  ${Object.entries(GAMES).map(([k, g]) => `<a class="game-link" href="index.html?game=${k}"${cur === 'index.html' && k === gameKey ? ' aria-current="page"' : ''}>${g.name}</a>`).join('')}
  <div class="menu-sep"></div>
  ${PAGES.map(([h, t]) => `<a href="${h}"${h === cur ? ' aria-current="page"' : ''}>${t}</a>`).join('')}
  <span class="off" aria-disabled="true">Настройки (скоро)</span>
</nav>`);

document.body.insertAdjacentHTML('beforeend', `
<footer class="site-footer">
  <a href="${REPO}" target="_blank" rel="noopener">GitHub</a>
  <div>
    <button class="btn ghost" type="button" data-feedback="Помощь">Помощь</button>
    <button class="btn ghost" type="button" data-feedback="Предложения">Предложения</button>
  </div>
</footer>`);

// ---- меню ----
const burger = document.getElementById('burger');
const menu = document.getElementById('side-menu');
const backdrop = document.getElementById('backdrop');
function setMenu(open) {
  burger.setAttribute('aria-expanded', open);
  burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  menu.hidden = backdrop.hidden = !open;
}
burger.addEventListener('click', () => setMenu(menu.hidden));
backdrop.addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });

// ---- модалка ----
function openModal(title, opener) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title">
    <button class="modal-x" type="button" aria-label="Закрыть">✕</button>
    <h2 id="m-title"></h2>
    <form novalidate>
      <label>Сообщение<textarea name="msg" rows="4" required></textarea></label>
      <label>Контакт (необязательно)<input name="contact" autocomplete="off"></label>
      <p class="form-error" role="alert"></p>
      <div class="modal-actions">
        <button class="btn ghost" type="button" data-cancel>Отмена</button>
        <button class="btn" type="submit">Отправить</button>
      </div>
    </form>
  </div>`;
  wrap.querySelector('#m-title').textContent = title;
  document.body.append(wrap);
  const form = wrap.querySelector('form');
  const err = wrap.querySelector('.form-error');
  form.msg.focus();

  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); opener?.focus(); };
  const onKey = e => {
    if (e.key === 'Escape') return close();
    if (e.key !== 'Tab') return;
    const f = [...wrap.querySelectorAll('button,textarea,input')];
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  wrap.querySelector('.modal-x').addEventListener('click', close);
  wrap.querySelector('[data-cancel]').addEventListener('click', close);
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (form.msg.value.trim().length < 10) { err.textContent = 'Сообщение должно быть не короче 10 символов.'; form.msg.focus(); return; }
    // TODO: GitHub Issues
    alert('Спасибо! Сообщение отправлено');
    close();
  });
}
document.querySelectorAll('[data-feedback]').forEach(b => b.addEventListener('click', () => openModal(b.dataset.feedback, b)));