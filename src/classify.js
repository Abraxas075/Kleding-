// Raadt kledingtype, kleur, patroon en maat uit productteksten (NL + EN).
const TYPE_RULES = [
  [/sneaker|schoen|shoe|boot|laars|laarzen|loafer|sandaal|sandal|pump|slipper|veterschoen/, 'shoes'],
  [/jurk|dress|gown/, 'dress'],
  [/\brok\b|skirt/, 'skirt'],
  [/legging|tights|panty/, 'leggings'],
  [/short|bermuda|zwembroek/, 'shorts'],
  [/jeans|denim broek|spijkerbroek/, 'jeans'],
  [/broek|chino|pantalon|trouser|jogger|joggingbroek|cargo|pants/, 'pants'],
  [/bodywarmer|gilet|waistcoat|puffer vest|mouwloos jack/, 'vest'],
  [/blazer|colbert|pak\b|suit jacket/, 'blazer'],
  [/mantel|trench|parka|winterjas|overcoat|\bcoat\b|duffle/, 'coat'],
  [/\bjas\b|jack\b|jacket|bomber|windbreaker|regenjas|anorak|puffer/, 'jacket'],
  [/hoodie|capuchon|hooded|sweatjack/, 'hoodie'],
  [/trui|sweater|pullover|jumper|knit|gebreid|cardigan|\bvest\b|sweatshirt|coltrui/, 'sweater'],
  [/longsleeve|long sleeve|lange mouw|manches longues/, 'longsleeve'],
  [/overhemd|\bshirt\b.*(button|knoop|oxford)|oxford|button.?down/, 'shirt'],
  [/blouse|tuniek|tunic/, 'blouse'],
  [/t-?shirt|\btee\b|top\b|polo|singlet|tanktop|tank top|shirt/, 'tshirt'],
];

const COLOR_RULES = [
  [/donkerblauw|navy|marine|dark blue|midnight/, '#1f2a4a'],
  [/lichtblauw|light blue|baby ?blue|hemelsblauw|sky/, '#a9c9e8'],
  [/jeansblauw|denim|indigo/, '#3f5f8f'],
  [/turquoise|teal|petrol|aqua/, '#1f7f86'],
  [/blauw|blue|cobalt|kobalt/, '#2f5fb0'],
  [/bordeaux|wijnrood|burgundy|wine|maroon/, '#6d1a2b'],
  [/rood|red|scarlet/, '#c0242d'],
  [/zwart|black|noir|nero/, '#1b1b1d'],
  [/antraciet|charcoal|anthracite/, '#3b3d42'],
  [/lichtgrijs|light gr[ae]y|zilver|silver/, '#bfc2c7'],
  [/grijs|gr[ae]y|melange/, '#8d9096'],
  [/off-?white|ecru|cr[eè]me|cream|ivoor|ivory/, '#efe8d8'],
  [/wit|white|blanc/, '#f4f2ee'],
  [/camel|cognac|kameel/, '#b27a45'],
  [/beige|zand|sand|taupe|stone|naturel|nude/, '#cdb99a'],
  [/bruin|brown|chocolade|mokka/, '#5b3a29'],
  [/olijf|olive|khaki|kaki|army|legergroen/, '#6b6b3a'],
  [/donkergroen|forest|bottle green|flessengroen/, '#254a34'],
  [/groen|green|mint|salie|sage/, '#3f8f5a'],
  [/mosterd|mustard|okergeel|oker/, '#c9a227'],
  [/geel|yellow|citroen/, '#f0d23c'],
  [/oranje|orange|terracotta|roest|rust/, '#d9722b'],
  [/fuchsia|magenta/, '#c2278a'],
  [/roze|pink|rose|zalm|salmon/, '#e8a0b5'],
  [/paars|purple|violet|lila|lavendel|lavender|aubergine/, '#6f4a9a'],
];

export function guessType(text = '') {
  const t = text.toLowerCase();
  for (const [re, type] of TYPE_RULES) if (re.test(t)) return type;
  return 'tshirt';
}

export function guessColor(text = '') {
  const t = text.toLowerCase();
  for (const [re, hex] of COLOR_RULES) if (re.test(t)) return hex;
  return null;
}

export function guessPattern(text = '') {
  const t = text.toLowerCase();
  if (/gestreept|streep|stripe/.test(t)) return 'stripes';
  if (/geruit|ruit|check|plaid|tartan|pied/.test(t)) return 'check';
  return 'solid';
}

export function guessSize(text = '') {
  const m = String(text).toUpperCase().match(/\b(XXS|XS|S|M|L|XL|XXL|2XL|3XL)\b/);
  if (!m) return null;
  return m[1] === '2XL' ? 'XXL' : m[1] === '3XL' ? 'XXL' : m[1] === 'XXS' ? 'XS' : m[1];
}

// Dominante kleur van een productfoto (negeert achtergrond). Geeft null bij CORS-blokkade.
export function dominantColor(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      try {
        const S = 64;
        const c = document.createElement('canvas');
        c.width = c.height = S;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, S, S);
        const d = ctx.getImageData(0, 0, S, S).data;
        const px = (x, y) => { const i = (y * S + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
        const corners = [px(1, 1), px(S - 2, 1), px(1, S - 2), px(S - 2, S - 2)];
        const near = (a, b, tol) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < tol;
        const buckets = new Map();
        for (let y = 6; y < S - 6; y++) for (let x = 10; x < S - 10; x++) {
          const p = px(x, y);
          if (p[3] < 200) continue;
          if (corners.some((cn) => near(p, cn, 40))) continue; // achtergrond
          const key = (p[0] >> 5) << 6 | (p[1] >> 5) << 3 | (p[2] >> 5);
          const b = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
          b.n++; b.r += p[0]; b.g += p[1]; b.b += p[2];
          buckets.set(key, b);
        }
        let best = null;
        for (const b of buckets.values()) if (!best || b.n > best.n) best = b;
        if (!best || best.n < 40) return resolve(null);
        const hex = [best.r, best.g, best.b].map((v) => Math.round(v / best.n).toString(16).padStart(2, '0')).join('');
        resolve('#' + hex);
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
