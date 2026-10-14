// Maatindeling en pasvorm. Eén stap in maat = ~1,2 cm extra ruimte rondom (straal).
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const STEP = 0.012;

const idx = (v, limits) => { const i = limits.findIndex((l) => v < l); return i < 0 ? limits.length : i; };

export function bodySizeIndex(profile, slot) {
  if (slot === 'bottom') {
    const w = idx(profile.waist, [72, 80, 88, 96, 104]);
    const h = idx(profile.hips, [92, 98, 104, 110, 116]);
    return Math.round((w + h) / 2);
  }
  return idx(profile.chest, [86, 94, 102, 110, 118]);
}

export function fitFor(item, profile, type) {
  if (!type || type.slot === 'shoes') return { delta: 0, label: '', tone: 'ok' };
  const slot = type.slot === 'dress' ? 'top' : type.slot;
  const body = bodySizeIndex(profile, slot);
  const have = SIZES.includes(item.size) ? SIZES.indexOf(item.size) : body;
  const diff = have - body;
  let label = 'Past precies', tone = 'ok';
  if (diff <= -2) { label = 'Veel te klein'; tone = 'bad'; }
  else if (diff === -1) { label = 'Strak'; tone = 'warn'; }
  else if (diff === 1) { label = 'Ruim'; tone = 'ok'; }
  else if (diff >= 2) { label = 'Veel te groot'; tone = 'warn'; }
  return { delta: diff * STEP, diff, label, tone, advice: SIZES[body] };
}
