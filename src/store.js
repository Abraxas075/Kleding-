const KEY = 'kleding3d.v1';

export const PRESETS = {
  neutraal: { height: 175, chest: 96, waist: 82, hips: 98, shoulders: 43, bust: 0.3 },
  man: { height: 181, chest: 102, waist: 88, hips: 99, shoulders: 47, bust: 0 },
  vrouw: { height: 168, chest: 92, waist: 74, hips: 100, shoulders: 39, bust: 1 },
};

export const DEFAULT_PROFILE = { ...PRESETS.neutraal, skin: '#e3b393', hair: '#3a2a20', hairStyle: 'short' };

export function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && raw.profile && Array.isArray(raw.items)) return { profile: { ...DEFAULT_PROFILE, ...raw.profile }, items: raw.items };
  } catch { /* geen opslag beschikbaar */ }
  return { profile: { ...DEFAULT_PROFILE }, items: [] };
}

export function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* negeren */ }
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export const DEMO_ITEMS = [
  { name: 'Donkerblauw overhemd (demo)', type: 'shirt', color: '#1f2a4a', size: 'M', price: '€ 39,95' },
  { name: 'Gestreepte longsleeve (demo)', type: 'longsleeve', color: '#2f5fb0', pattern: 'stripes', size: 'M', price: '€ 24,95' },
  { name: 'Grijze hoodie (demo)', type: 'hoodie', color: '#8d9096', size: 'M', price: '€ 49,95' },
  { name: 'Zwarte jas (demo)', type: 'jacket', color: '#1b1b1d', size: 'M', price: '€ 99,00' },
  { name: 'Beige chino (demo)', type: 'pants', color: '#cdb99a', size: 'M', price: '€ 44,95' },
  { name: 'Blauwe jeans (demo)', type: 'jeans', color: '#3f5f8f', size: 'M', price: '€ 59,95' },
  { name: 'Rode jurk (demo)', type: 'dress', color: '#c0242d', size: 'M', price: '€ 69,95' },
  { name: 'Witte sneakers (demo)', type: 'shoes', color: '#f4f2ee', size: 'M', price: '€ 79,95' },
];
