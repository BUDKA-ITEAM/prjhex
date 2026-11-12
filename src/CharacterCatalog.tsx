import { useEffect, useState } from 'react';
import { Anchor, ArrowLeft, ArrowRight, Leaf, LoaderCircle, Search, UserRound } from 'lucide-react';
import { worlds, type CharacterSummary, type FranchiseId } from '../shared/game.js';
import { api } from './api.js';

type CatalogPage = { characters: CharacterSummary[]; total: number };
const PAGE_SIZE = 40;

function CatalogPortrait({ character }: { character: CharacterSummary }) {
  const [failed, setFailed] = useState(false);
  return <div className="catalog-portrait">
    {character.imageUrl && !failed ? <img src={character.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/> : <UserRound size={40} role="img" aria-label="Нет изображения персонажа"/>}
  </div>;
}

export function CharacterCatalog({ initialWorld }: { initialWorld: FranchiseId }) {
  const [worldId, setWorldId] = useState(initialWorld);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<CatalogPage>({ characters: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const world = worlds.find(w => w.id === worldId)!;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ worldId, q: query.trim(), offset: String(page * PAGE_SIZE), limit: String(PAGE_SIZE) });
      void api<CatalogPage>(`/catalog?${params}`, { signal: controller.signal })
        .then(result => { if (!controller.signal.aborted) setData(result); })
        .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Не удалось загрузить персонажей.'); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, query.trim() ? 200 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [worldId, query, page, retry]);

  return <div className="character-catalog">
    <div className="catalog-worlds" role="group" aria-label="Мир каталога">
      {worlds.map(w => { const Icon = w.id === 'naruto' ? Leaf : Anchor; return <button key={w.id} type="button" aria-pressed={worldId === w.id} onClick={() => { setWorldId(w.id); setPage(0); }}><Icon size={18}/>{w.name}</button>; })}
    </div>
    <label className="catalog-search"><Search size={19}/><span className="sr-only">Поиск персонажей в каталоге</span><input type="search" value={query} maxLength={80} placeholder="Имя или псевдоним персонажа…" onChange={e => { setQuery(e.target.value); setPage(0); }}/></label>
    <div className="catalog-summary" role="status" aria-live="polite">{world.name} · {loading ? 'Загрузка…' : error ? 'Ошибка загрузки' : `Найдено персонажей: ${data.total}`}</div>
    <div className="catalog-results" aria-busy={loading}>
      {loading ? <div className="catalog-message"><LoaderCircle size={22} className="spin"/> Загружаем персонажей…</div> : error ? <div className="catalog-message" role="alert"><p>{error}</p><button className="secondary-button" onClick={() => setRetry(n => n + 1)}>Повторить</button></div> : data.characters.length ? <ul className="catalog-grid">{data.characters.map(character => <li key={`${worldId}:${character.id}`} className="catalog-card"><CatalogPortrait character={character}/><strong>{character.name}</strong>{character.aliases.some(alias => alias !== character.name) && <small>{character.aliases.find(alias => alias !== character.name)}</small>}</li>)}</ul> : <div className="catalog-message">Ничего не найдено. Попробуйте другое имя или написание.</div>}
    </div>
    {!loading && !error && data.total > PAGE_SIZE && <nav className="catalog-pagination" aria-label="Страницы каталога">
      <button className="secondary-button" disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Предыдущая страница"><ArrowLeft size={16}/> Назад</button>
      <span>Страница {page + 1} из {Math.ceil(data.total / PAGE_SIZE)}</span>
      <button className="secondary-button" disabled={(page + 1) * PAGE_SIZE >= data.total} onClick={() => setPage(p => p + 1)} aria-label="Следующая страница">Далее <ArrowRight size={16}/></button>
    </nav>}
  </div>;
}
