import * as THREE from 'three';
import { createBodyModel, buildBody } from './body.js';
import { buildGarment } from './garments.js';
import { TYPES } from './catalog.js';
import { fitFor } from './sizing.js';

/** Bouwt lichaam + gedragen kleding, met laagstapeling zodat stoffen elkaar niet doorsteken. */
export function buildAvatar(profile, items) {
  const model = createBodyModel(profile);
  const root = new THREE.Group();
  root.add(buildBody(model));

  const worn = items.filter((i) => i.worn && TYPES[i.type]);
  const ease = {};
  for (const it of worn) {
    const t = TYPES[it.type];
    ease[it.id] = t.slot === 'shoes' ? 0 : Math.max(0.002, (t.ease ?? 0.01) + fitFor(it, profile, t).delta);
  }
  const bySlot = (s) => worn.find((i) => TYPES[i.type].slot === s);
  const top = bySlot('top') || bySlot('dress');
  const bottom = bySlot('bottom') || bySlot('dress');
  const outer = bySlot('outer');
  if (top && bottom && top !== bottom) ease[top.id] = Math.max(ease[top.id], ease[bottom.id] + 0.006);
  if (outer) {
    const under = Math.max(top ? ease[top.id] : 0, bottom ? ease[bottom.id] : 0);
    if (top || bottom) ease[outer.id] = Math.max(ease[outer.id], under + 0.008);
  }
  for (const it of worn) root.add(buildGarment(it, model, ease[it.id]));
  root.userData.model = model;
  return root;
}

export function disposeGroup(group) {
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => { m.map?.dispose(); m.dispose(); });
    }
  });
}
