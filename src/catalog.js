// Kledingtypen. Hoogtes zijn fracties van de lichaamslengte, ease in meters.
export const SLOTS = ['top', 'outer', 'bottom', 'dress', 'shoes'];

export const TYPES = {
  tshirt: { label: 'T-shirt', slot: 'top', hem: 0.5, sleeve: 0.4, ease: 0.016 },
  longsleeve: { label: 'Longsleeve', slot: 'top', hem: 0.5, sleeve: 1, ease: 0.018 },
  shirt: { label: 'Overhemd', slot: 'top', hem: 0.47, sleeve: 1, ease: 0.022, collar: true, buttons: true },
  blouse: { label: 'Blouse', slot: 'top', hem: 0.49, sleeve: 1, ease: 0.024, collar: true, buttons: true },
  sweater: { label: 'Trui / cardigan', slot: 'top', hem: 0.49, sleeve: 1, ease: 0.032 },
  hoodie: { label: 'Hoodie', slot: 'top', hem: 0.48, sleeve: 1, ease: 0.036, hood: true },
  vest: { label: 'Bodywarmer / gilet', slot: 'outer', hem: 0.49, sleeve: 0, ease: 0.03, zip: true },
  jacket: { label: 'Jas / jack', slot: 'outer', hem: 0.47, sleeve: 1, ease: 0.03, zip: true },
  blazer: { label: 'Blazer', slot: 'outer', hem: 0.44, sleeve: 1, ease: 0.028, buttons: true, collar: true },
  coat: { label: 'Mantel / winterjas', slot: 'outer', hem: 0.31, sleeve: 1, ease: 0.045, flare: 0.1, buttons: true, collar: true },
  jeans: { label: 'Jeans', slot: 'bottom', leg: 0.06, ease: 0.01, rough: 0.95 },
  pants: { label: 'Broek / chino', slot: 'bottom', leg: 0.06, ease: 0.014 },
  leggings: { label: 'Legging', slot: 'bottom', leg: 0.05, ease: 0.003 },
  shorts: { label: 'Korte broek', slot: 'bottom', leg: 0.3, ease: 0.016 },
  skirt: { label: 'Rok', slot: 'bottom', hem: 0.33, ease: 0.012, flare: 0.35, skirt: true },
  dress: { label: 'Jurk', slot: 'dress', hem: 0.32, sleeve: 0.25, ease: 0.014, flare: 0.3 },
  shoes: { label: 'Schoenen', slot: 'shoes' },
};

export const PATTERNS = { solid: 'Effen', stripes: 'Gestreept', check: 'Geruit' };

// slots die niet tegelijk gedragen kunnen worden
export function conflicts(slotA, slotB) {
  if (slotA === slotB) return true;
  const pair = [slotA, slotB].sort().join('+');
  return pair === 'bottom+dress' || pair === 'dress+top';
}
