import { CharacterCatalog } from './CharacterCatalog.js';
import { OnePieceBanner } from './OnePieceBanner.js';
import { WorldBanner } from './WorldBanner.js';
import { NarutoBanner } from './NarutoBanner.js';
import { NatureIcons } from './NatureIcons.js';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Anchor, ArrowDown, ArrowRight, ArrowUp, Check, CircleHelp, Copy, Database, Flame, Leaf, LoaderCircle, RotateCcw, Search, Shield, Sparkles, Target, Trophy, UserRound, X, Zap } from 'lucide-react';
import { worlds, worldById, type Bootstrap, type Cell, type CharacterSummary, type Criterion, type FranchiseId, type GameView } from '../shared/game.js';
import { api, readSaved, save, RequestError } from './api.js';


const symbols: Record<FranchiseId, typeof Anchor> = { 'one-piece':Anchor,naruto:Leaf,'fairy-tail':Flame,dxd:Zap,'girls-und-panzer':Shield };
const matchLabel = { correct:'Совпадение',partial:'Частично',wrong:'Не совпадает',unknown:'Неизвестно' };
const initialWorld = (): FranchiseId => { const saved = readSaved('anidle-world'); return worlds.find(w => w.id === saved)?.id ?? 'one-piece'; };
function Avatar({ character, large = false }: { character: CharacterSummary; large?: boolean }) {
  const [failed,setFailed] = useState(false);
  useEffect(()=>setFailed(false),[character.imageUrl]);
  const missingImage = !character.imageUrl || failed;
  return <span className={`avatar ${large ? 'avatar-large' : ''}${missingImage ? ' avatar-placeholder' : ''}`} role={missingImage ? 'img' : undefined} aria-label={missingImage ? 'Нет изображения персонажа' : undefined}>
    {character.imageUrl && !failed ? <img src={character.imageUrl} alt="" loading="lazy" onError={() => setFailed(true)} referrerPolicy="no-referrer" /> : <UserRound size={24} aria-hidden="true"/>}
  </span>;
}
function TraitCell({ cell, criterion }: { cell: Cell; criterion: Criterion }) {
  let label: string;
  if (cell.value === null) label = criterion.unknownCategory ? 'Не раскрыто' : 'Неизвестно';
  else if (Array.isArray(cell.value)) label = cell.value.length ? cell.value.join(', ') : 'Нет';
  else label = typeof cell.value === 'number' ? new Intl.NumberFormat('ru-RU').format(cell.value) : cell.value;
  return <td><div className={`trait-cell ${cell.match}`} title={`${criterion.label}: ${label}. ${matchLabel[cell.match]}${cell.direction === 'up' ? '. У загаданного больше' : cell.direction === 'down' ? '. У загаданного меньше' : ''}${criterion.unknownCategory && cell.value===null ? '. В импортированных источниках значение не установлено; это игровая категория.' : ''}${cell.note ? '\n'+cell.note : ''}`}>
    <span className="cell-mark" aria-hidden="true">{cell.match === 'correct' ? <Check size={12}/> : cell.match === 'partial' ? '≈' : cell.match === 'unknown' ? '?' : '×'}</span>
    <span className="trait-value">{cell.key==='nature' && Array.isArray(cell.value) && cell.value.length ? <NatureIcons value={cell.value}/> : label}{typeof cell.value === 'number' && criterion.unit ? <small> {criterion.unit}</small> : ''}</span>
    {cell.direction && (cell.direction === 'up' ? <ArrowUp className="direction" size={16}/> : <ArrowDown className="direction" size={16}/>)}
    <span className="sr-only">{matchLabel[cell.match]}{cell.direction === 'up' ? ', у загаданного больше' : cell.direction === 'down' ? ', у загаданного меньше' : ''}</span>
  </div></td>;
}
function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    if (!dialog.open) dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);
  return <dialog ref={ref} className={`modal${wide ? ' modal-catalog' : ''}`} aria-labelledby="modal-title" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target !== e.currentTarget) return; const bounds = e.currentTarget.getBoundingClientRect(); if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) onClose(); }}>
    <div className="modal-heading"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Закрыть"><X size={20}/></button></div>{children}
  </dialog>;
}
export default function App() {
  const [worldId,setWorldId] = useState<FranchiseId>(initialWorld);
  const world = worldById(worldId);
  const [bootstrap,setBootstrap] = useState<Bootstrap | null>(null);
  const [storedGame,setGame] = useState<GameView | null>(null);
  const game = storedGame?.worldId === worldId ? storedGame : null;
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [query,setQuery] = useState('');
  const [results,setResults] = useState<CharacterSummary[]>([]);
  const [searching,setSearching] = useState(false);
  const [searchError,setSearchError] = useState('');
  const [selected,setSelected] = useState(0);
  const [focused,setFocused] = useState(false);
  const [modal,setModal] = useState<'help' | 'catalog' | 'restart' | null>(null);
  const [notice,setNotice] = useState('');
  const [reload,setReload] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestEpoch = useRef(0);
  const mutation = useRef(false);
  const guessed = new Set(game?.guesses.map(g => g.character.id));
  const available = results.filter(c => !guessed.has(c.id));
  const stats = bootstrap?.stats;
  const criteria = game?.criteria ?? bootstrap?.worlds.find(w=>w.id===worldId)?.criteria ?? world.criteria;

  useEffect(() => {
    save('anidle-world',worldId);
    const controller = new AbortController();
    const epoch = ++requestEpoch.current;
    setLoading(true); setError(''); setGame(null); setQuery(''); setResults([]); setSearchError(''); setNotice('');
    void (async () => {
      try {
        const boot = await api<Bootstrap>('/bootstrap',{signal:controller.signal});
        if (epoch !== requestEpoch.current) return;
        setBootstrap(boot);
        const saved = readSaved(`anidle-game:${worldId}`);
        let active: GameView | null = null;
        if (saved) {
          try { active = await api<GameView>(`/games/${encodeURIComponent(saved)}`,{signal:controller.signal}); }
          catch (e) { if (!(e instanceof RequestError && ['NOT_FOUND','INVALID_REQUEST','DRAFT_DISABLED','GAME_NEEDS_RESTART'].includes(e.code))) throw e; }
        }
        if (active?.worldId !== worldId || active.status === 'abandoned') active = null;
        if (!active) active = await api<GameView>('/games',{method:'POST',body:JSON.stringify({worldId,restart:true}),signal:controller.signal});
        if (epoch !== requestEpoch.current) return;
        setGame(active); save(`anidle-game:${worldId}`,active.id);
      } catch (e) { if (!controller.signal.aborted && epoch === requestEpoch.current) setError(e instanceof Error ? e.message : 'Не удалось начать игру.'); }
      finally { if (epoch === requestEpoch.current && !controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  },[worldId,reload]);

  useEffect(() => {
    const controller = new AbortController();
    setResults([]); setSelected(0); setSearchError('');
    if (!query.trim() || !game || game.status !== 'playing') { setSearching(false); return; }
    setSearching(true);
    const timer = window.setTimeout(() => {
      void api<{characters:CharacterSummary[]}>(`/characters?worldId=${worldId}&gameId=${game.id}&q=${encodeURIComponent(query.trim())}`,{signal:controller.signal})
        .then(r => { if (!controller.signal.aborted) setResults(r.characters); })
        .catch(e => { if (!controller.signal.aborted) setSearchError(e instanceof Error ? e.message : 'Ошибка поиска'); })
        .finally(() => { if (!controller.signal.aborted) setSearching(false); });
    },250);
    return () => { clearTimeout(timer); controller.abort(); };
  },[query,worldId,game?.id,game?.status]);

  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''),4000); return () => clearTimeout(timer); },[notice]);

  async function submit(character: CharacterSummary) {
    if (!game || mutation.current || game.status !== 'playing') return;
    mutation.current = true; setBusy(true); setError(''); setFocused(false);
    try {
      const result = await api<GameView>(`/games/${game.id}/guesses`,{method:'POST',body:JSON.stringify({characterId:character.id})});
      setGame(result); setQuery(''); setResults([]);
      if (result.status === 'won') setBootstrap(await api<Bootstrap>('/bootstrap'));
      else inputRef.current?.focus();
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось отправить попытку.'); }
    finally { mutation.current = false; setBusy(false); }
  }
  async function revealHint(){
    if(!game||!game.debutHintAvailable||mutation.current)return;
    mutation.current=true;setBusy(true);setError('');
    try{setGame(await api<GameView>(`/games/${game.id}/hint`,{method:'POST'}));}
    catch(e){setError(e instanceof Error?e.message:'Не удалось открыть подсказку.');}
    finally{mutation.current=false;setBusy(false);}
  }  async function surrender() {
    if(!game||game.status!=='playing'||mutation.current)return;
    mutation.current=true;setBusy(true);setError('');setFocused(false);
    try{
      const result=await api<GameView>(`/games/${game.id}/surrender`,{method:'POST'});
      setGame(result);setQuery('');setResults([]);setBootstrap(await api<Bootstrap>('/bootstrap'));
    }catch(e){setError(e instanceof Error?e.message:'Не удалось завершить партию.');}
    finally{mutation.current=false;setBusy(false);}
  }  async function restart() {
    if (mutation.current) return;
    mutation.current = true; setBusy(true); setModal(null); setError('');
    try {
      const active = await api<GameView>('/games',{method:'POST',body:JSON.stringify({worldId,restart:true})});
      setGame(active); save(`anidle-game:${worldId}`,active.id); setQuery(''); setResults([]);
      setBootstrap(await api<Bootstrap>('/bootstrap')); inputRef.current?.focus();
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось начать новую партию.'); }
    finally { mutation.current = false; setBusy(false); }
  }
  async function share() {
    if (!game) return;
    const squares = {correct:'🟩',partial:'🟨',wrong:'🟥',unknown:'🟨'};
    const text = `ANIDLE · ${world.name}\nУгадано за ${game.guesses.length} попыток${game.draft ? ' · тестовая база' : ''}\n` + game.guesses.map(g => g.cells.map(c => squares[c.match]).join('')).join('\n');
    try { await navigator.clipboard.writeText(text); setNotice('Результат скопирован'); }
    catch { setNotice('Браузер не разрешил копирование'); }
  }
  const closeModal = useRef(() => setModal(null)).current;
  const failedAttempts = game?.guesses.filter(g => !g.won).length ?? 0;
  const canSearch = Boolean(game && game.status === 'playing' && !busy && !loading);
  const listOpen = focused && Boolean(query.trim()) && canSearch;
  return <div className="app-shell relative isolate min-h-screen overflow-hidden" data-world={worldId} style={{'--accent':world.accent} as CSSProperties}>
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <header className="site-header">
      <a className="wordmark" href="#" aria-label="ANIDLE, главная" onClick={e => e.preventDefault()}><span className="brand-icon"><Sparkles size={19}/></span>ANI<span className="wordmark-soft">DLE</span><span className="beta">BETA</span></a>
      <nav className="header-actions flex items-center gap-6" aria-label="Информация об игре">
        <button className="text-button" aria-label="База персонажей" onClick={() => setModal('catalog')}><Database size={16}/><span>База персонажей</span></button>
        <span className="header-divider"/>
        <button className="text-button" aria-label="Как играть" onClick={() => setModal('help')}><CircleHelp size={17}/><span>Как играть</span></button>
      </nav>
    </header>
    <main className="main-content">
      <div className="intro-line"><span className="tiny-label"><span className="pulse-dot"/> ЧЕТЫРЕ МИРА. ТЫСЯЧИ ИСТОРИЙ.</span><span className="intro-right">Один загаданный герой.</span></div>
      <section className="world-selector" aria-label="Выберите аниме">
        {worlds.map(w => { const Icon = symbols[w.id]; return <button key={w.id} className={`world-tab ${w.id === worldId ? 'active' : ''}`} style={{'--tab-accent':w.accent} as CSSProperties} aria-pressed={w.id === worldId} disabled={busy} onClick={() => setWorldId(w.id)}>
          <Icon size={21}/><span>{w.name}</span>{w.id === worldId ? <span className="tab-dot"/> : <span className="tab-number">{w.symbol}</span>}
        </button>; })}
      </section>
      {worldId === 'naruto' ? <NarutoBanner failedAttempts={failedAttempts} playing={game?.status === 'playing'} busy={busy || loading} hintRevealed={Boolean(game?.debutHint)} onHint={()=>void revealHint()} onSurrender={()=>void surrender()}/> : worldId === 'one-piece' ? <OnePieceBanner failedAttempts={failedAttempts} playing={game?.status === 'playing'} busy={busy || loading} hintRevealed={Boolean(game?.debutHint)} onHint={()=>void revealHint()} onSurrender={()=>void surrender()}/> : <WorldBanner name={world.name} failedAttempts={failedAttempts} playing={game?.status === 'playing'} busy={busy || loading} hintRevealed={Boolean(game?.debutHint)} onHint={()=>void revealHint()} onSurrender={()=>void surrender()}/>}

      <section className="play-area" aria-label="Игра">
        {game?.debutHint&&<div className="debut-hint" role="status"><Sparkles size={18}/><div><strong>Подсказка: первое появление</strong><p>{game.debutHint}</p></div></div>}
        <div className="game-toolbar"><div className="section-label"><span className="accent-line"/> ТВОЯ СЛЕДУЮЩАЯ ДОГАДКА</div>
          <div className="toolbar-right flex items-center gap-4"><button className="text-button restart-button" disabled={busy || loading} onClick={() => game?.status === 'playing' && game.guesses.length ? setModal('restart') : void restart()}><RotateCcw size={14}/><span>Новая партия</span></button></div>
        </div>
        {game?.status==='surrendered' ? <div className="surrender-result" role="status">{game.answer&&<Avatar character={game.answer} large/>}<div><strong>Правильный ответ: {game.answer?.name ?? 'Персонаж не найден'}</strong><p>Партия завершена. Серия побед сброшена.</p></div><button className="primary-button" disabled={busy} onClick={()=>void restart()}>Новая партия <ArrowRight size={17}/></button></div> : game?.status === 'won' ? <div className="victory" role="status"><div className="victory-icon"><Trophy size={25}/></div><div><strong>Это {game.guesses.at(-1)?.character.name}!</strong><p>Вы нашли героя за {game.guesses.length} попыток.</p></div><button className="secondary-button" onClick={() => void share()}><Copy size={15}/><span>Поделиться</span></button><button className="primary-button" disabled={busy} onClick={() => void restart()}>Ещё партия <ArrowRight size={17}/></button></div> : <div className="search-area">
          <form className={`guess-form ${focused ? 'is-focused' : ''}`} onSubmit={e => { e.preventDefault(); if (available[selected]) void submit(available[selected]); }}>
            <Search size={22} className="search-icon"/>
            <input ref={inputRef} role="combobox" aria-label="Имя персонажа" aria-autocomplete="list" aria-expanded={listOpen} aria-controls="character-options" aria-activedescendant={listOpen && available[selected] ? `option-${selected}` : undefined}
              placeholder={loading ? 'Готовим новую загадку…' : 'Введите имя персонажа…'} value={query} maxLength={80} autoComplete="off" disabled={!canSearch}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={e => { setFocused(true); setResults([]); setQuery(e.target.value); }}
              onKeyDown={e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setFocused(true); setSelected(i => Math.max(0,Math.min(available.length-1,i+(e.key === 'ArrowDown' ? 1 : -1)))); } if (e.key === 'Escape') setFocused(false); }}/>
            <span className="enter-hint">↵ ENTER</span><button className="guess-button" type="submit" disabled={!canSearch || !available[selected]} aria-label="Проверить выбранного персонажа">{busy || loading ? <LoaderCircle size={20} className="spin"/> : <ArrowRight size={21}/>}</button>
          </form>
          {listOpen && <div className="search-dropdown" id="character-options" role="listbox" aria-label="Персонажи">
            {searching ? <div className="search-message"><LoaderCircle size={16} className="spin"/> Ищем персонажей…</div> : searchError ? <div className="search-message" role="alert">{searchError}</div> : available.length ? available.map((c,i) => <button type="button" role="option" aria-selected={selected === i} id={`option-${i}`} key={c.id} className={`character-option ${selected === i ? 'selected' : ''}`} onMouseDown={e => e.preventDefault()} onMouseEnter={() => setSelected(i)} onClick={() => void submit(c)}><Avatar character={c}/><span><strong>{c.name}</strong><small>{c.aliases[0]}</small></span><ArrowRight size={16}/></button>) : <div className="search-message">Персонаж не найден среди доступных профилей. Попробуйте другое имя или латиницу.</div>}
          </div>}
        </div>}
        {error && <div className="error-message" role="alert"><CircleHelp size={17}/><span>{error}</span>{!game && <button onClick={() => setReload(n => n+1)}>Повторить</button>}</div>}
        <div className="table-section">
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Таблица сравнений, прокручивается горизонтально">
            <table className="comparison-table"><colgroup><col className="character-column"/>{criteria.map(c => <col key={c.key}/>)}</colgroup><thead><tr><th className="character-heading">ПЕРСОНАЖ</th>{criteria.map(c => <th key={c.key}>{worldId==='naruto' ? ({village:'Аффилиации',jutsu:'Виды дзюцу',kekkei:'Kekkei Genkai',nature:'Виды природы',debut:'Дебютная дуга'} as Record<string,string>)[c.key] ?? c.label : c.label.toLocaleUpperCase('ru-RU')}</th>)}</tr></thead>
              <tbody>{[...(game?.guesses ?? [])].reverse().map((g,index) => <tr key={g.character.id} className="guess-row"><td><div className="character-cell"><span className="attempt-index">{String((game?.guesses.length ?? 0)-index).padStart(2,'0')}</span><Avatar character={g.character}/><span className="character-name">{g.character.name}{g.won && <small><Check size={11}/> Верный ответ</small>}</span></div></td>{criteria.map(c => <TraitCell key={c.key} criterion={c} cell={g.cells.find(cell => cell.key === c.key) ?? {key:c.key,value:null,match:'unknown'}}/>)}</tr>)}</tbody>
            </table>
          </div>
          {!game?.guesses.length && <div className="empty-history"><div className="empty-target"><Target size={26}/></div><strong>{loading ? 'Загадка уже близко' : 'Каждая попытка — новая зацепка'}</strong>{loading && <p>Подождите, пока загрузится партия.</p>}</div>}
        </div>
        <div className="bottom-strip"><span><Shield size={14}/> Прогресс сохраняется в этом браузере</span></div>
      </section>
      <section className="stats-section" aria-label="Ваша статистика"><div className="stats-intro"><span className="stats-icon"><Trophy size={20}/></span><div><h2>Твой путь героя</h2><p>Статистика в этом браузере</p></div></div>
        <div className="stat"><strong>{stats?.played ?? '—'}</strong><span>Завершено партий</span></div><div className="stat"><strong>{stats?.won ?? '—'}</strong><span>Угадано героев</span></div><div className="stat"><strong>{stats ? `${stats.played ? Math.round(stats.won/stats.played*100) : 0}%` : '—'}</strong><span>Побед</span></div><div className="stat"><strong>{stats?.bestStreak ?? '—'} <Flame size={15}/></strong><span>Лучшая серия</span></div>
      </section>
    </main>
    {notice && <div className="toast" role="status">{notice}</div>}
    {modal && <Modal wide={modal === 'catalog'} title={modal === 'help' ? 'Как играть' : modal === 'catalog' ? 'База персонажей' : 'Новая партия'} onClose={closeModal}>
{modal === 'help' ? <div><p>Выбирайте персонажей из списка. Зелёный означает совпадение, жёлтый — частичное или близкое значение, красный — различие. Стрелка показывает направление для чисел.</p><p>В новой партии выбирается случайный персонаж. Подсказка дебюта доступна после 5 ошибок, сдача — после 10. Прогресс хранится в браузере.</p></div> : modal === 'catalog' ? <CharacterCatalog initialWorld={worldId}/> : <div className="restart-content"><p>Текущая партия будет завершена как пропущенная. Серия побед прервётся.</p><div className="modal-actions"><button className="secondary-button" onClick={closeModal}>Продолжить угадывать</button><button className="primary-button" onClick={() => void restart()}>Новая партия <ArrowRight size={16}/></button></div></div>}
    </Modal>}
  </div>;
}











