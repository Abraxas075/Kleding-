import * as THREE from 'three';
import { loft } from './loft.js';
import { torsoStations } from './body.js';
import { TYPES } from './catalog.js';

function patternTexture(color, kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const base = new THREE.Color(color);
  const lum = 0.2126 * base.r + 0.7152 * base.g + 0.0722 * base.b;
  const alt = base.clone().lerp(new THREE.Color(lum > 0.55 ? '#000000' : '#ffffff'), lum > 0.55 ? 0.28 : 0.75);
  x.fillStyle = '#' + base.getHexString();
  x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#' + alt.getHexString();
  if (kind === 'stripes') x.fillRect(0, 0, 64, 12);
  else { x.globalAlpha = 0.55; x.fillRect(0, 0, 64, 16); x.fillRect(0, 0, 16, 64); x.globalAlpha = 1; }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function fabric(item, type) {
  const mat = new THREE.MeshStandardMaterial({ color: item.color || '#888888', roughness: type.rough ?? 0.88, metalness: 0, side: THREE.DoubleSide });
  if (item.pattern === 'stripes' || item.pattern === 'check') {
    mat.color.set('#ffffff');
    mat.map = patternTexture(item.color || '#888888', item.pattern);
    mat.map.repeat.set(item.pattern === 'check' ? 14 : 3, 16);
  }
  return mat;
}

const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; };

/** Bouwt één kledingstuk. ease = radiale ruimte (m) incl. maat en laagstapeling. */
export function buildGarment(item, model, ease) {
  const type = TYPES[item.type];
  const g = new THREE.Group();
  g.name = `garment:${item.id}`;
  if (!type) return g;
  const mat = fabric(item, type);
  const { H, Y, k } = model;

  if (type.slot === 'shoes') return buildShoes(item, model, mat);

  const torsoLike = type.slot === 'top' || type.slot === 'outer' || type.slot === 'dress';
  if (torsoLike) {
    const hemY = type.hem * H;
    const flare = type.flare ?? 0;
    const st = torsoStations(model, hemY, Y.neckBase, ease, { n: 30, flare, minLeg: hemY < Y.crotch });
    g.add(mesh(loft({ stations: st, seg: 44 }), mat));
    const sleeve = type.sleeve ?? 0;
    if (sleeve > 0) {
      const sleeveEase = Math.min(ease * 0.5 + 0.004, 0.026);
      for (const side of [-1, 1]) {
        const o = model.armOrigin(side), d = model.armDir(side);
        const L = model.armLen * Math.min(sleeve, 1) * (sleeve >= 1 ? 1.0 : 1);
        const stations = [];
        for (let i = 0; i <= 10; i++) { const t = (L * i) / 10; const r = model.armR(t) + sleeveEase; stations.push({ t, a: r, b: r * 0.96 }); }
        g.add(mesh(loft({ origin: o.toArray(), dir: d.toArray(), stations, seg: 28 }), mat));
        const ball = mesh(new THREE.SphereGeometry(1, 20, 14), mat);
        ball.scale.setScalar(model.armR(0) + sleeveEase * 0.9);
        ball.position.copy(o);
        g.add(ball);
      }
    }
    addDetails(g, type, model, ease);
  } else {
    buildBottom(g, type, model, ease, mat);
  }
  return g;
}

function buildBottom(g, type, model, ease, mat) {
  const { H, Y } = model;
  if (type.skirt) {
    const st = torsoStations(model, type.hem * H, 0.6 * H, ease, { n: 22, flare: type.flare, minLeg: true });
    g.add(mesh(loft({ stations: st, seg: 44 }), mat));
    return;
  }
  // bekken
  const st = torsoStations(model, Y.crotch, 0.6 * H, ease, { n: 12 });
  g.add(mesh(loft({ stations: st, seg: 40, capStart: true }), mat));
  const hem = type.leg * H;
  const tEnd = Y.legTop - hem;
  for (const side of [-1, 1]) {
    const stations = [];
    for (let i = 0; i <= 14; i++) {
      const t = (tEnd * i) / 14;
      const r = model.legR(t) + ease + (type.tight ? 0 : 0.004 * (t / tEnd));
      stations.push({ t, a: r, b: r * 0.97 });
    }
    g.add(mesh(loft({ origin: model.legOrigin(side).toArray(), dir: model.legDir(side).toArray(), stations, seg: 28 }), mat));
  }
}

function addDetails(g, type, model, ease) {
  const { H } = model;
  const trim = new THREE.MeshStandardMaterial({ color: type.zip ? '#2b2b2e' : '#e9e6df', roughness: 0.4, metalness: type.zip ? 0.6 : 0 });
  const front = (y) => { const s = model.torso(y); return s.b + s.oz + ease + 0.002; };
  if (type.buttons) {
    const top = 0.8 * H, bottom = (type.hem + 0.06) * H;
    const n = type.hem < 0.4 ? 5 : 6;
    for (let i = 0; i < n; i++) {
      const y = top - ((top - bottom) * i) / (n - 1);
      const b = mesh(new THREE.SphereGeometry(0.0075 * model.k, 10, 8), trim);
      b.scale.z = 0.45;
      b.position.set(0, y, front(y));
      g.add(b);
    }
  }
  if (type.zip) {
    const y0 = (type.hem + 0.01) * H, y1 = 0.832 * H, n = 14;
    for (let i = 0; i < n; i++) {
      const ya = y0 + ((y1 - y0) * i) / n, yb = y0 + ((y1 - y0) * (i + 1)) / n;
      const za = front(ya), zb = front(yb), len = Math.hypot(yb - ya, zb - za);
      const z = mesh(new THREE.BoxGeometry(0.006, len * 1.02, 0.004), trim);
      z.position.set(0, (ya + yb) / 2, (za + zb) / 2);
      z.rotation.x = Math.atan2(zb - za, yb - ya);
      g.add(z);
    }
  }
  if (type.collar) {
    const r = model.neckR * 1.3 + ease * 0.4;
    const c = mesh(new THREE.TorusGeometry(r, 0.012 * model.k, 8, 32), g.children[0].material);
    c.rotation.x = Math.PI / 2;
    c.position.set(0, 0.848 * H, 0.004);
    g.add(c);
  }
  if (type.hood) {
    const h = mesh(new THREE.TorusGeometry(model.neckR * 1.55 + ease * 0.5, 0.032 * model.k, 10, 32), g.children[0].material);
    h.rotation.x = Math.PI / 2 - 0.35;
    h.position.set(0, 0.852 * H, -0.025 * model.k);
    g.add(h);
  }
}

function buildShoes(item, model, mat) {
  const g = new THREE.Group();
  const k = model.k;
  const sole = new THREE.MeshStandardMaterial({ color: '#f0eee9', roughness: 0.6 });
  for (const side of [-1, 1]) {
    const ankle = model.legPoint(side, model.legLen);
    const upper = mesh(new THREE.SphereGeometry(1, 28, 18), mat);
    upper.scale.set(0.046 * k, 0.043 * k, 0.135 * k);
    upper.position.set(ankle.x, 0.048 * k, 0.05 * k);
    g.add(upper);
    const shaft = mesh(new THREE.CylinderGeometry(0.04 * k, 0.045 * k, 0.05 * k, 20), mat);
    shaft.position.set(ankle.x, 0.07 * k, -0.005 * k);
    g.add(shaft);
    const s = mesh(new THREE.SphereGeometry(1, 28, 12), sole);
    s.scale.set(0.048 * k, 0.012 * k, 0.14 * k);
    s.position.set(ankle.x, 0.011 * k, 0.05 * k);
    g.add(s);
  }
  return g;
}
