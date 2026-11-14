const primaryMagic = {
  Gajeel_Redfox: ['dragon slayer magic'],
  Natsu_Dragneel: ['dragon slayer magic', 'transformation magic'],
  August: ['copy'],
  Brain: ['black magic', 'archive', 'organic link magic'],
  God_Serena: ['dragon slayer magic'],
  Hades: ['black arts', 'living magic', 'chain magic'],
  Jellal_Fernandes: ['heavenly body magic', 'darkness magic'],
  Makarov_Dreyar: ['giant', 'light magic', 'fairy magic'],
  Mavis_Vermillion: ['fairy magic', 'illusion magic', 'black magic'],
  Ultear_Milkovich: ['time magic', 'molding magic', 'transformation magic'],
  Zeref_Dragneel: ['black magic', 'living magic', 'time magic'],
};

const aliases = {
  'hell flame dragon slayer magic': 'fire dragon slayer magic',
  'lightning dragon mode': 'lightning dragon slayer magic',
  'ice-make': 'molding magic', 'water-make': 'molding magic',
  'fire-make': 'molding magic', 'wood-make': 'molding magic',
  'the knight': 'requip', 'the gunner': 'requip',
  'beast soul': 'take over', 'animal soul': 'take over',
  'god soul': 'take over', 'machina soul': 'take over',
  'animal transformation': 'transformation magic',
  'arc of time': 'time magic', 'age seal': 'time magic',
  'ankhseram black magic': 'black magic', 'black arts': 'black magic',
  'fairy law': 'fairy magic', 'fairy glitter': 'fairy magic',
  'fairy sphere': 'fairy magic', 'law': 'fairy magic',
  'teleportation magic': 'spatial magic', 'telepathic': 'telepathy',
};
const secondaryMagic = new Set([
  'thought projection', 'telepathy', 'telekinesis', 'dispel',
  'magic barrier', 'ushi no koku mairi', 'anti-link',
]);

export function normalizeFairyTailMagic(profile) {
  const raw = profile.fields?.magic;
  const categories = [...new Set((Array.isArray(raw) ? raw : [])
    .filter(value => typeof value === 'string' && value.trim())
    .map(value => value.trim().toLowerCase())
    .map(value => aliases[value] ?? value)
    .map(value => /(?:^| )dragon slayer magic$/.test(value) ? 'dragon slayer magic' : value))];
  const main = categories.filter(value => !secondaryMagic.has(value));
  const magic = categories.length === 0 ? [] : (primaryMagic[profile.id] ?? (main.length ? main : categories)).slice(0, 3);
  const qualifier = / (\([^)]*\))$/.exec(profile.id.replaceAll('_', ' '))?.[1];
  const name = qualifier && !profile.name.endsWith(qualifier) ? profile.name + ' ' + qualifier : profile.name;
  return {...profile, name, fields: {...profile.fields, magic}};
}
