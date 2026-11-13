import { normalizeDebut } from '../js/debut-arcs.js';
import { GAMES, compareField, formatField, debutEpisode, numericDirection } from '../js/columns.js';
import {
  worlds,
  type GameView,
  type CharacterSummary,
  type Criterion,
  type Stats
} from '../shared/game.js';

export class RequestError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export const readSaved = (key: string) => {
  try {
    return localStorage.getItem('prjhex-ui:' + key);
  } catch {
    return null;
  }
};

export const save = (key: string, value: string) => {
  try {
    localStorage.setItem('prjhex-ui:' + key, value);
  } catch {}
};

type Profile = {
  id: string;
  name: string;
  aliases?: string[];
  image_url?: string;
  fields: Record<string, any>
};

type Stored = {
  presentationVersion?: number;
  view: GameView;
  target: string
};

const configuration = (world: string) => {
  switch (world) {
    case 'one-piece':
      return GAMES.onepiece;
    case 'naruto':
      return GAMES.naruto;
    case 'dxd':
      return GAMES.dxd;
    case 'girls-und-panzer':
      return GAMES.gup;
    default:
      throw new RequestError('NO_PROFILES', 'Неизвестный мир.');
  }
};

const mappedKey = (key: string) =>
  ({
    nature_type: 'nature',
    kekkei_genkai: 'kekkei',
    debut_arc: 'debut',
    affiliation: 'village'
  } as Record<string, string>)[key] ?? key;

const gameCriteria = (world: string): Criterion[] =>
  configuration(world).columns.map(c => ({
    key: world === 'naruto' ? mappedKey(c.key) : c.key,
    label: c.label,
    kind: c.key === 'nature_type' ? 'set' : 'text'
  }));

const summary = (c: Profile): CharacterSummary => ({
  id: c.id,
  name: c.name,
  aliases: c.aliases ?? [],
  imageUrl: c.image_url ?? null
});

const pending = new Map<string, Promise<Profile[]>>();

const episodeWorld=(world:string)=>world==='naruto'||world==='one-piece';
const eligible=(world:string,rows:Profile[])=>episodeWorld(world)?rows.filter(c=>debutEpisode(c.fields.first)!==null):rows;

async function catalog(world = 'one-piece') {
  if (!pending.has(world))
    pending.set(
      world,
      (async () => {
        const response = await fetch(
          `${import.meta.env.BASE_URL}${configuration(world).dataDir}/characters-full.json`
        );
        if (!response.ok)
          throw new RequestError('NETWORK', 'Не удалось загрузить каталог ' + world);

        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error('Неверный формат каталога');

        return data.filter(
          c => typeof c.id === 'string' && typeof c.name === 'string' && c.fields
        ).map(c=>normalizeDebut(c,world)) as Profile[];
      })().catch(e => {
        pending.delete(world);
        throw e;
      })
    );

  return pending.get(world)!;
}

function stats(world: string): Stats {
  try {
    return JSON.parse(readSaved('stats:' + world) || 'null') ?? {
      played: 0,
      won: 0,
      currentStreak: 0,
      bestStreak: 0
    };
  } catch {
    return { played: 0, won: 0, currentStreak: 0, bestStreak: 0 };
  }
}

function finish(won: boolean, world: string) {
  const s = stats(world);
  s.played++;
  s.won += Number(won);
  s.currentStreak = won ? s.currentStreak + 1 : 0;
  s.bestStreak = Math.max(s.bestStreak, s.currentStreak);
  save('stats:' + world, JSON.stringify(s));
}

function store(g: Stored) {
  save('game:' + g.view.worldId, JSON.stringify(g));
  return structuredClone(g.view);
}

function active(id?: string): Stored {
  try {
    const g = worlds
      .map(({ id: w }) => {
        try {
          return JSON.parse(readSaved('game:' + w) || 'null');
        } catch {
          return null;
        }
      })
      .find(g => g && (!id || g.view.id === id));

    if (!g || id && g.view.id !== id) throw Error();
    return g;
  } catch {
    throw new RequestError('NOT_FOUND', 'Партия не найдена. Начните новую.');
  }
}

function activeForWorld(world: string): Stored {
  const raw = readSaved('game:' + world);
  if (!raw) throw new RequestError('NOT_FOUND', 'Нет партии');
  return JSON.parse(raw);
}

export function normalizeNature(value: unknown): string[] {
  const names: Record<string, string> = {
    'fire release': 'Огонь',
    'water release': 'Вода',
    'wind release': 'Ветер',
    'earth release': 'Земля',
    'lightning release': 'Молния',
    'wood release': 'Дерево'
  };

  return Array.isArray(value)
    ? [...new Set(value.map(v => names[String(v).trim().toLowerCase()] ?? (Object.values(names).includes(String(v)) ? String(v) : null)).filter((v): v is string => v !== null))]
    : [];
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  options.signal?.throwIfAborted();

  const url = new URL(path, 'https://local.invalid');
  const body = options.body ? JSON.parse(String(options.body)) : {};
  const routeGame = /^\/games\/([^/]+)/.exec(url.pathname);
  const world = routeGame
    ? active(decodeURIComponent(routeGame[1])).view.worldId
    : body.worldId ?? url.searchParams.get('worldId') ?? readSaved('anidle-world') ?? 'one-piece';

  if (!worlds.some(w => w.id === world))
    throw new RequestError('NO_PROFILES', 'Неизвестный мир.');

  const cols = configuration(world).columns,
    criteria = gameCriteria(world);
  const allData = await catalog(world);
  const data = url.pathname==='/catalog'?allData:eligible(world,allData);
  options.signal?.throwIfAborted();

  let result: unknown;

  if (url.pathname === '/bootstrap')
    result = {
      worlds: worlds.map(w => ({ ...w, criteria: gameCriteria(w.id) })),
      coverage: await Promise.all(
        worlds.map(async w => {
          const rows = await catalog(w.id);
          return {
            worldId: w.id,
            catalog: rows.length,
            playable: eligible(w.id,rows).length,
            reviewed: 0,
            drafts: 0,
            importedWorks: 0
          };
        })
      ),
      stats: stats(world),
      draftMode: false
    };
  else if (url.pathname === '/catalog') {
    const q = (url.searchParams.get('q') || '').trim().toLocaleLowerCase();
    const numeric = (key: string, fallback: number, max: number) => {
      const value = Number(url.searchParams.get(key) ?? fallback);
      return Number.isFinite(value)
        ? Math.max(0, Math.min(max, Math.floor(value)))
        : fallback;
    };
    const offset = numeric('offset', 0, Number.MAX_SAFE_INTEGER),
      limit = Math.max(1, numeric('limit', 40, 100));
    const filtered = data.filter(c =>
      [c.name, ...c.aliases ?? []].some(name => name.toLocaleLowerCase().includes(q))
    );

    result = {
      characters: filtered.slice(offset, offset + limit).map(summary),
      total: filtered.length
    };
  } else if (url.pathname === '/characters') {
    const q = (url.searchParams.get('q') || '').trim().toLocaleLowerCase();
    result = {
      characters: data
        .filter(c => world==='one-piece' ? c.name.toLocaleLowerCase().startsWith(q) : [c.name, ...c.aliases ?? []].some(n => n.toLocaleLowerCase().includes(q)))
        .sort((a,b)=>world==='one-piece'?a.name.localeCompare(b.name,'en',{sensitivity:'base'})||a.id.localeCompare(b.id):0)
        .slice(0, 30)
        .map(summary)
    };
  } else if (url.pathname === '/games' && options.method === 'POST') {
    if (!data.length) throw new RequestError('NO_PROFILES', 'Нет персонажей с указанной серией появления. Добавьте fields.debut.episode или fields.first.episode в JSON этого мира.');

    try {
      const old = activeForWorld(world);
      if (old.view.status === 'playing' && (!episodeWorld(world) || old.presentationVersion===5 && old.view.criteria.some(c=>c.key==='first') && data.some(c=>c.id===old.target))) {
        if (!body.restart) return structuredClone(old.view) as T;
        finish(false, world);
      }
    } catch (e) {
      if (!(e instanceof RequestError)) throw e;
    }

    const number = crypto.getRandomValues(new Uint32Array(1))[0];
    const target = data[Math.floor(number / 4294967296 * data.length)];
    result = store({
      presentationVersion:5,
      target: target.id,
      view: {
        id: crypto.randomUUID(),
        worldId: world,
        status: 'playing',
        guesses: [],
        draft: false,
        createdAt: new Date().toISOString(),
        criteria
      }
    });
  } else {
    const match = /^\/games\/([^/]+)(?:\/(guesses|hint|surrender))?$/.exec(url.pathname);
    if (!match) throw new RequestError('NOT_FOUND', 'Действие не найдено.');

    const g = active(decodeURIComponent(match[1]));
    if(episodeWorld(world)&&(g.presentationVersion!==5||!g.view.criteria.some(c=>c.key==='first')))throw new RequestError('GAME_NEEDS_RESTART','Правила дебюта обновлены. Начните новую партию.');
    const target = data.find(c => c.id === g.target);
    if (!target)
      throw new RequestError('GAME_NEEDS_RESTART', 'Каталог обновлён. Начните новую партию.');

    if (match[2]) {
      if (g.view.status !== 'playing')
        throw new RequestError('GAME_FINISHED', 'Партия завершена.');

      const failed = g.view.guesses.filter(x => !x.won).length;

      if (match[2] === 'hint') {
        if (failed < 5) throw new RequestError('HINT_LOCKED', 'Нужно 5 неверных попыток.');
        g.view.debutHint = episodeWorld(world) ? formatField(configuration(world).columns.find(c=>c.key==='first')!,target.fields.first,true) : 'Первое появление не указано в каталоге.';
      }

      if (match[2] === 'surrender') {
        if (failed < 10)
          throw new RequestError('SURRENDER_LOCKED', 'Нужно 10 неверных попыток.');
        g.view.status = 'surrendered';
        g.view.answer = summary(target);
        finish(false, world);
      }

      if (match[2] === 'guesses') {
        const c = data.find(c => c.id === body.characterId);
        if (!c) throw new RequestError('NOT_FOUND', 'Персонаж не найден.');
        if (g.view.guesses.some(x => x.character.id === c.id))
          throw new RequestError('DUPLICATE', 'Персонаж уже выбран.');

        const won = c.id === target.id;
        g.view.guesses.push({
          character: summary(c),
          won,
          cells: cols.map(col => {
            const status = world==='naruto'&&col.key==='nature_type' ? compareField(col,{fields:{nature_type:normalizeNature(c.fields.nature_type)}},{fields:{nature_type:normalizeNature(target.fields.nature_type)}}) : compareField(col, c, target);
            return {
              key: world === 'naruto' ? mappedKey(col.key) : col.key,
              value: world === 'naruto' && col.key === 'nature_type'
                ? normalizeNature(c.fields[col.key])
                : formatField(col, c.fields[col.key], true),
              match: status === 'correct'
                ? 'correct'
                : status === 'close'
                  ? 'partial'
                  : 'wrong',
              ...(col.key==='age' ? (numericDirection(c.fields.age,target.fields.age)?{direction:numericDirection(c.fields.age,target.fields.age)}:{}) : status === 'up' || status === 'down' ? { direction: status } : {})
            };
          })
        });

        if (won) {
          g.view.status = 'won';
          finish(true, world);
        }
        g.view.debutHintAvailable = g.view.guesses.filter(x => !x.won).length >= 5;
      }
    }
    for(const guess of g.view.guesses){const profile=data.find(c=>c.id===guess.character.id);for(const cell of guess.cells){if(cell.key==='age'){const arrow=numericDirection(profile?.fields.age,target.fields.age);if(arrow)cell.direction=arrow;else delete cell.direction;}}}
    if(world==='naruto')for(const guess of g.view.guesses){const profile=data.find(c=>c.id===guess.character.id);for(const cell of guess.cells)if(cell.key==='nature'){cell.value=normalizeNature(profile?.fields.nature_type??cell.value);const col=configuration(world).columns.find(c=>c.key==='nature_type')!;const status=compareField(col,{fields:{nature_type:cell.value}},{fields:{nature_type:normalizeNature(target.fields.nature_type)}});cell.match=status==='correct'?'correct':status==='close'?'partial':'wrong';}}
    result = store(g);
  }

  return result as T;
}
