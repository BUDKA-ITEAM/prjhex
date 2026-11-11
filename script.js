"use strict";

// ============================================================
// КОНФИГ
// ============================================================

const CONFIG = {
  dataDir: "data",
  wrongAttemptsToRevealQuote: 3,
  storagePrefix: "animedle:",
};

// Колонки таблицы. Прямой перенос из configs/onepiece.dle.json.
// Если захочешь несколько DLE — вынеси в data/config.json и грузи fetch'ем.
const COLUMNS = [
  { key: "first",       label: "Дебют",          type: "appearance", compare: { exact: 5, close: 20 } },
  { key: "affiliation", label: "Принадлежность", type: "list" },
  { key: "occupation",  label: "Занятие",        type: "list" },
  { key: "origin",      label: "Происхождение",  type: "region" },
  { key: "status",      label: "Статус",         type: "enum" },
  { key: "age",         label: "Возраст",        type: "number", compare: { kind: "numeric_close", tolerance: 5 } },
  { key: "bounty",      label: "Награда",        type: "number", compare: { kind: "numeric_order", tolerance_percent: 10 } },
  { key: "dftype",      label: "Тип фрукта",     type: "enum" },
];

// ============================================================
// УТИЛИТЫ
// ============================================================

const $ = (id) => document.getElementById(id);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(CONFIG.storagePrefix + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(CONFIG.storagePrefix + key, JSON.stringify(value));
  } catch { /* quota exceeded */ }
}

async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

// ============================================================
// БУРГЕР-МЕНЮ
// ============================================================

function initMenu() {
  const burger = $("burger-btn");
  const menu = $("side-menu");
  const backdrop = $("menu-backdrop");
  if (!burger || !menu || !backdrop) return;

  function openMenu() {
    menu.hidden = false;
    backdrop.hidden = false;
    requestAnimationFrame(() => {
      menu.classList.add("is-open");
      backdrop.classList.add("is-open");
    });
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Закрыть меню");
  }

  function closeMenu() {
    menu.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Открыть меню");
    setTimeout(() => {
      menu.hidden = true;
      backdrop.hidden = true;
    }, 250);
  }

  burger.addEventListener("click", () => {
    const isOpen = burger.getAttribute("aria-expanded") === "true";
    isOpen ? closeMenu() : openMenu();
  });

  backdrop.addEventListener("click", closeMenu);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") {
      closeMenu();
    }
  });
}

// ============================================================
// МОДАЛКА "ПОМОЩЬ / ПРЕДЛОЖЕНИЯ"
// ============================================================

function initFeedbackModal() {
  const footerActions = $("footer-actions");
  if (!footerActions) return;

  const modal = document.createElement("div");
  modal.id = "feedback-modal";
  modal.className = "modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="modal__backdrop" data-close></div>
    <div class="modal__dialog" role="dialog" aria-modal="true"
         aria-labelledby="feedback-title">
      <header class="modal__header">
        <h2 id="feedback-title" class="modal__title"></h2>
        <button type="button" class="modal__close" data-close aria-label="Закрыть">×</button>
      </header>
      <form id="feedback-form" class="modal__form" novalidate>
        <label for="feedback-message" class="modal__label">Сообщение</label>
        <textarea id="feedback-message" class="modal__textarea" rows="5" required></textarea>

        <label for="feedback-contact" class="modal__label">Email или Telegram (необязательно)</label>
        <input id="feedback-contact" class="modal__input" type="text">

        <p id="feedback-error" class="modal__error" hidden></p>

        <div class="modal__actions">
          <button type="button" class="btn" data-close>Отмена</button>
          <button type="submit" class="btn btn--accent">Отправить</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const form = modal.querySelector("#feedback-form");
  const messageInput = modal.querySelector("#feedback-message");
  const contactInput = modal.querySelector("#feedback-contact");
  const errorEl = modal.querySelector("#feedback-error");
  const titleEl = modal.querySelector("#feedback-title");
  let lastFocus = null;

  function onKeydown(e) {
    if (e.key === "Escape") closeModal();
  }

  function openModal(mode) {
    lastFocus = document.activeElement;
    titleEl.textContent = mode === "help" ? "Помощь" : "Предложения";
    form.dataset.mode = mode;
    form.reset();
    errorEl.hidden = true;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add("is-open"));
    messageInput.focus();
    document.addEventListener("keydown", onKeydown);
  }

  function closeModal() {
    modal.classList.remove("is-open");
    setTimeout(() => { modal.hidden = true; }, 200);
    document.removeEventListener("keydown", onKeydown);
    if (lastFocus) lastFocus.focus();
  }

  footerActions.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-page]");
    if (!btn) return;
    e.preventDefault();
    const page = btn.dataset.page;
    if (page === "help" || page === "feedback") openModal(page);
  });

  modal.addEventListener("click", (e) => {
    if (e.target.matches("[data-close]")) closeModal();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (message.length < 10) {
      errorEl.textContent = "Сообщение должно быть не короче 10 символов.";
      errorEl.hidden = false;
      messageInput.focus();
      return;
    }
    // TODO: заменить на открытие GitHub Issues URL
    console.log("Отправить:", {
      mode: form.dataset.mode,
      message,
      contact: contactInput.value.trim(),
    });
    alert("Спасибо! Сообщение отправлено.");
    closeModal();
  });
}

// ============================================================
// СРАВНЕНИЕ ПОЛЕЙ
// ============================================================

function compareList(guess, answer) {
  const gl = Array.isArray(guess) ? guess : [];
  const al = Array.isArray(answer) ? answer : [];
  if (!gl.length && !al.length) return "correct";
  if (!gl.length || !al.length) return "wrong";
  if (gl[0] === al[0]) return "correct";
  const set = new Set(al);
  return gl.some((x) => set.has(x)) ? "close" : "wrong";
}

function compareRegion(guess, answer) {
  if (!guess && !answer) return "correct";
  if (!guess || !answer) return "wrong";
  if (guess.region !== answer.region) return "wrong";
  return guess.detail === answer.detail ? "correct" : "close";
}

function compareEnum(guess, answer) {
  if (guess == null && answer == null) return "correct";
  return guess === answer ? "correct" : "wrong";
}

function compareNumber(guess, answer, rule) {
  if (guess == null && answer == null) return "correct";
  if (guess == null || answer == null) return "wrong";
  if (guess === answer) return "correct";

  if (rule.kind === "numeric_close") {
    return Math.abs(guess - answer) <= rule.tolerance
      ? "close"
      : (guess < answer ? "up" : "down");
  }

  if (rule.kind === "numeric_order") {
    if (answer === 0) return guess === 0 ? "correct" : "wrong";
    const pct = (Math.abs(guess - answer) * 100) / Math.abs(answer);
    if (pct <= rule.tolerance_percent) return "close";
    return guess < answer ? "up" : "down";
  }

  return "wrong";
}

function compareAppearance(guess, answer, rule) {
  if (!guess && !answer) return "correct";
  if (!guess || !answer) return "wrong";

  if (guess.chapter != null && answer.chapter != null) {
    const d = Math.abs(guess.chapter - answer.chapter);
    if (d === 0 || d <= rule.exact) return "correct";
    if (d <= rule.close) return "close";
    return "wrong";
  }
  if (guess.episode != null && answer.episode != null) {
    const d = Math.abs(guess.episode - answer.episode);
    if (d === 0 || d <= rule.exact) return "correct";
    if (d <= rule.close) return "close";
    return "wrong";
  }
  return "wrong";
}

function compareField(col, guessValue, answerValue) {
  switch (col.type) {
    case "appearance": return compareAppearance(guessValue, answerValue, col.compare);
    case "list":       return compareList(guessValue, answerValue);
    case "region":     return compareRegion(guessValue, answerValue);
    case "enum":       return compareEnum(guessValue, answerValue);
    case "number":     return compareNumber(guessValue, answerValue, col.compare);
    default:           return "wrong";
  }
}

function compareCharacter(guess, answer) {
  const out = {};
  for (const col of COLUMNS) {
    out[col.key] = compareField(col, guess.fields[col.key], answer.fields[col.key]);
  }
  return out;
}

// ============================================================
// РЕНДЕР
// ============================================================

const STATUS_ICON = {
  correct: "✔",
  close:   "≈",
  wrong:   "✖",
  up:      "↑",
  down:    "↓",
};

function formatFieldValue(col, value) {
  if (value == null) return "—";
  switch (col.type) {
    case "appearance": {
      const parts = [];
      if (value.chapter != null) parts.push(`гл. ${value.chapter}`);
      if (value.episode != null) parts.push(`эп. ${value.episode}`);
      return parts.join(", ") || "—";
    }
    case "list":
      return Array.isArray(value) && value.length ? value.join(", ") : "—";
    case "region":
      if (!value.region) return "—";
      return value.detail ? `${value.region} (${value.detail})` : value.region;
    case "number":
      if (col.key === "bounty") return value.toLocaleString("ru-RU") + " ฿";
      return String(value);
    default:
      return String(value);
  }
}

function renderRow(guess, statuses) {
  const tbody = $("results-body");
  if (!tbody) return;

  const tr = document.createElement("tr");

  const nameCell = document.createElement("td");
  nameCell.textContent = guess.name;
  tr.appendChild(nameCell);

  for (const col of COLUMNS) {
    const status = statuses[col.key];
    const td = document.createElement("td");
    td.dataset.status = status;
    td.textContent = STATUS_ICON[status] || "?";
    td.title = `${col.label}: ${formatFieldValue(col, guess.fields[col.key])}`;
    tr.appendChild(td);
  }

  tbody.appendChild(tr);
}

function clearRows() {
  const tbody = $("results-body");
  if (tbody) tbody.replaceChildren();
}

// ============================================================
// ИГРА: СОСТОЯНИЕ
// ============================================================

const Game = {
  characters: [],
  byId: new Map(),
  index: [],
  answer: null,
  quote: null,
  state: null,
  puzzleId: null,
};

function stateKey() {
  return `state:${Game.puzzleId}`;
}

function saveState() {
  storageSet(stateKey(), Game.state);
}

function wrongAttempts() {
  return Game.state?.wrong ?? 0;
}

function attempts() {
  return Game.state?.attempts ?? [];
}

function isSolved() {
  return Game.state?.solved === true;
}

function isQuoteRevealed() {
  return Game.state?.quoteRevealed === true;
}

function canRevealQuote() {
  return Game.quote != null && wrongAttempts() >= CONFIG.wrongAttemptsToRevealQuote;
}

// ============================================================
// ИГРА: UI
// ============================================================

function updateQuoteUI() {
  const placeholder = $("quote-placeholder");
  const full = $("quote-full");
  const lock = $("quote-lock");
  const revealBtn = $("reveal-quote-btn");
  const count = $("wrong-attempts-count");
  const total = $("wrong-attempts-total");
  const needed = $("wrong-attempts-needed");

  if (count) count.textContent = String(wrongAttempts());
  if (total) total.textContent = String(CONFIG.wrongAttemptsToRevealQuote);
  if (needed) needed.textContent = String(CONFIG.wrongAttemptsToRevealQuote);

  if (!Game.quote) {
    if (placeholder) {
      placeholder.hidden = false;
      placeholder.textContent = "Цитата для этого дня недоступна.";
    }
    if (full) full.hidden = true;
    if (lock) lock.hidden = true;
    return;
  }

  const revealed = isQuoteRevealed();
  if (placeholder) placeholder.hidden = revealed;
  if (full) {
    full.hidden = !revealed;
    if (revealed) full.textContent = `«${Game.quote}»`;
  }
  if (lock) lock.hidden = revealed;
  if (revealBtn) revealBtn.disabled = !canRevealQuote() || revealed;
}

function updateStatusUI() {
  const attemptsLeft = $("attempts-left");
  const resultBanner = $("result-banner");
  const resultText = $("result-text");
  const resultCharacter = $("result-character");
  const newGameBtn = $("new-game-btn");
  const input = $("character-input");
  const submit = $("submit-guess-btn");

  if (attemptsLeft) attemptsLeft.textContent = String(attempts().length);

  if (isSolved()) {
    if (resultBanner) resultBanner.hidden = false;
    if (resultText) resultText.textContent = "Угадал!";
    if (resultCharacter) resultCharacter.textContent = Game.answer?.name ?? "";
    if (newGameBtn) newGameBtn.hidden = false;
    if (input) input.disabled = true;
    if (submit) submit.disabled = true;
  } else {
    if (resultBanner) resultBanner.hidden = true;
  }
}

function revealQuote() {
  if (!Game.quote) return;
  if (wrongAttempts() < CONFIG.wrongAttemptsToRevealQuote) return;
  Game.state.quoteRevealed = true;
  saveState();
  updateQuoteUI();
}

function onSubmitGuess(character) {
  if (isSolved() || !character) return;
  if (attempts().some((a) => a.characterId === character.id)) return;

  const statuses = compareCharacter(character, Game.answer);
  const isCorrect = Object.values(statuses).every((s) => s === "correct");

  Game.state.attempts.push({
    characterId: character.id,
    name: character.name,
    statuses,
  });

  if (isCorrect) {
    Game.state.solved = true;
  } else {
    Game.state.wrong += 1;
  }

  saveState();
  renderRow(character, statuses);
  updateQuoteUI();
  updateStatusUI();
}

// ============================================================
// АВТОКОМПЛИТ
// ============================================================

function initAutocomplete() {
  const input = $("character-input");
  const list = $("suggestions-list");
  const form = $("guess-form");
  const errorEl = $("guess-error");
  if (!input || !list || !form) return;

  let selected = null;
  let activeIndex = -1;

  function closeList() {
    list.hidden = true;
    list.replaceChildren();
    activeIndex = -1;
  }

  function renderSuggestions(query) {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return closeList();

    const matches = Game.index
      .filter((c) => {
        if (c.name.toLowerCase().includes(q)) return true;
        return c.aliases.some((a) => a.toLowerCase().includes(q));
      })
      .slice(0, 10);

    if (!matches.length) return closeList();

    list.replaceChildren();
    matches.forEach((m) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.dataset.id = m.id;
      li.textContent = m.name;
      list.appendChild(li);
    });

    list.hidden = false;
    activeIndex = -1;
  }

  function selectCharacter(id) {
    const character = Game.byId.get(id);
    if (!character) return;
    selected = character;
    input.value = character.name;
    closeList();
  }

  function highlight(index) {
    const items = list.querySelectorAll("li");
    items.forEach((el, i) => el.classList.toggle("is-active", i === index));
    activeIndex = index;
  }

  input.addEventListener("input", () => {
    selected = null;
    renderSuggestions(input.value);
  });

  input.addEventListener("keydown", (e) => {
    if (list.hidden) return;
    const items = list.querySelectorAll("li");
    if (!items.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlight((activeIndex + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlight((activeIndex - 1 + items.length) % items.length);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectCharacter(items[activeIndex].dataset.id);
    } else if (e.key === "Escape") {
      closeList();
    }
  });

  list.addEventListener("click", (e) => {
    const li = e.target.closest("li[data-id]");
    if (li) selectCharacter(li.dataset.id);
  });

  document.addEventListener("click", (e) => {
    if (!list.hidden && !e.target.closest("#autocomplete")) closeList();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (errorEl) errorEl.hidden = true;

    let character = selected;
    if (!character) {
      const q = input.value.trim().toLowerCase();
      const match = Game.index.find(
        (c) =>
          c.name.toLowerCase() === q ||
          c.aliases.some((a) => a.toLowerCase() === q),
      );
      if (match) character = Game.byId.get(match.id);
    }

    if (!character) {
      if (errorEl) {
        errorEl.textContent = "Выбери персонажа из подсказок.";
        errorEl.hidden = false;
      }
      return;
    }

    if (attempts().some((a) => a.characterId === character.id)) {
      if (errorEl) {
        errorEl.textContent = "Этого персонажа ты уже вводил.";
        errorEl.hidden = false;
      }
      return;
    }

    onSubmitGuess(character);
    selected = null;
    input.value = "";
    closeList();
  });
}

// ============================================================
// ЗАГРУЗКА ДАННЫХ
// ============================================================

async function loadAll() {
  const dir = CONFIG.dataDir;

  const [characters, index, daily] = await Promise.all([
    fetchJSON(`${dir}/characters-full.json`),
    fetchJSON(`${dir}/characters-index.json`),
    fetchJSON(`${dir}/daily.json`),
  ]);

  Game.characters = characters;
  Game.byId = new Map(characters.map((c) => [c.id, c]));
  Game.index = index;

  const today = todayKey();
  const answerId = daily[today];
  if (!answerId) throw new Error(`В daily.json нет даты ${today}`);

  Game.answer = Game.byId.get(answerId);
  if (!Game.answer) throw new Error(`Персонаж ${answerId} не найден`);
  Game.puzzleId = today;

  // цитата — опционально
  try {
    const quotes = await fetchJSON(`${dir}/quotes.json`);
    Game.quote = quotes[answerId] ?? null;
  } catch {
    Game.quote = null;
  }

  // состояние из localStorage
  Game.state = storageGet(stateKey()) ?? {
    attempts: [],
    wrong: 0,
    solved: false,
    quoteRevealed: false,
  };
}

// ============================================================
// ВОССТАНОВЛЕНИЕ ПОСЛЕ RELOAD
// ============================================================

function restoreState() {
  clearRows();
  for (const attempt of attempts()) {
    const character = Game.byId.get(attempt.characterId);
    if (character) renderRow(character, attempt.statuses);
  }
  updateQuoteUI();
  updateStatusUI();
}

// ============================================================
// ТОЧКА ВХОДА
// ============================================================

async function initGame() {
  const hasGame = $("guess-form") && $("results-table");
  if (!hasGame) return;

  try {
    await loadAll();
  } catch (err) {
    console.error(err);
    const errorEl = $("guess-error");
    if (errorEl) {
      errorEl.textContent = "Не удалось загрузить данные игры. Попробуй обновить страницу.";
      errorEl.hidden = false;
    }
    return;
  }

  initAutocomplete();
  restoreState();

  const revealBtn = $("reveal-quote-btn");
  if (revealBtn) revealBtn.addEventListener("click", revealQuote);
}

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  initFeedbackModal();
  initGame();
});