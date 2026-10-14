import test from 'node:test';
import assert from 'node:assert/strict';
import { guessType, guessColor, guessPattern, guessSize } from '../src/classify.js';
import { fitFor, bodySizeIndex } from '../src/sizing.js';
import { TYPES, conflicts } from '../src/catalog.js';
import { loft, monotone } from '../src/loft.js';
import { createBodyModel } from '../src/body.js';
import { DEFAULT_PROFILE } from '../src/store.js';

test('type-herkenning NL/EN', () => {
  assert.equal(guessType('Slim fit jeans zwart'), 'jeans');
  assert.equal(guessType('Gebreide trui met ronde hals'), 'sweater');
  assert.equal(guessType('Hoodie met capuchon'), 'hoodie');
  assert.equal(guessType('Witte sneakers'), 'shoes');
  assert.equal(guessType('Zomerjurk bloemenprint'), 'dress');
  assert.equal(guessType('Bomber jacket'), 'jacket');
  assert.equal(guessType('Bodywarmer gewatteerd'), 'vest');
  assert.equal(guessType('Basic T-shirt'), 'tshirt');
});

test('kleur, patroon en maat', () => {
  assert.equal(guessColor('Navy blauw'), '#1f2a4a');
  assert.equal(guessColor('bordeaux'), '#6d1a2b');
  assert.equal(guessColor('onbekend'), null);
  assert.equal(guessPattern('Gestreepte trui'), 'stripes');
  assert.equal(guessPattern('Geruit overhemd'), 'check');
  assert.equal(guessSize('maat xl'), 'XL');
});

test('pasvorm', () => {
  const body = bodySizeIndex(DEFAULT_PROFILE, 'top');
  assert.equal(fitFor({ size: 'S' }, DEFAULT_PROFILE, TYPES.tshirt).diff, 1 - body);
  assert.equal(fitFor({ size: 'XS' }, { ...DEFAULT_PROFILE, chest: 110 }, TYPES.tshirt).tone, 'bad');
  assert.equal(fitFor({ size: 'M' }, DEFAULT_PROFILE, TYPES.shoes).delta, 0);
});

test('slot-conflicten', () => {
  assert.ok(conflicts('dress', 'top'));
  assert.ok(conflicts('dress', 'bottom'));
  assert.ok(!conflicts('outer', 'top'));
});

test('monotone interpolatie raakt de knooppunten en overshoot niet', () => {
  const f = monotone([[0, 0], [1, 1], [2, 1], [3, 5]]);
  assert.equal(f(1), 1);
  assert.ok(f(1.5) <= 1.0001);
});

test('loft geeft correct aantal vertices/indices en genormaliseerde normalen', () => {
  const g = loft({ stations: [{ t: 0, a: 1, b: 1 }, { t: 1, a: 1, b: 1 }], seg: 8 });
  assert.equal(g.getAttribute('position').count, 2 * 9);
  assert.equal(g.getIndex().count, 8 * 6);
  const n = g.getAttribute('normal');
  assert.ok(Math.abs(Math.hypot(n.getX(0), n.getY(0), n.getZ(0)) - 1) < 1e-6);
  assert.ok(n.getX(0) > 0.9); // buitenwaarts bij θ=0
});

test('lichaamsmodel schaalt met lengte en blijft binnen de verwachte proporties', () => {
  const m = createBodyModel({ ...DEFAULT_PROFILE, height: 190 });
  assert.ok(Math.abs(m.H - 1.9) < 1e-9);
  assert.ok(m.torso(m.Y.waist).a < m.torso(m.Y.chest).a + 0.05);
  assert.ok(m.legR(0) > m.legR(m.legLen));
});
