import * as THREE from 'three';
import { loft, monotone } from './loft.js';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;

// halve breedte/diepte van een ellips met omtrek C (m) en diepte/breedte-verhouding k
function ellipse(C, k) {
  const r = C / TAU;
  const a = r / Math.sqrt((1 + k * k) / 2);
  return [a, a * k];
}

/** Berekent alle lichaamsafmetingen (meters) uit het profiel (cm). */
export function createBodyModel(p) {
  const H = p.height / 100;
  const cm = (v) => v / 100;
  const sh = cm(p.shoulders) / 2;
  const hips = ellipse(cm(p.hips), 0.7);
  const waist = ellipse(cm(p.waist), 0.68);
  const chest = ellipse(cm(p.chest), 0.66);
  const neckR = (cm(p.chest) * 0.36) / TAU;
  const bust = p.bust || 0;
  const Y = {
    ankle: 0.04 * H, knee: 0.285 * H, crotch: 0.46 * H, legTop: 0.5 * H, hips: 0.52 * H,
    waist: 0.62 * H, chest: 0.72 * H, shoulder: 0.782 * H, neckBase: 0.842 * H, chin: 0.868 * H,
  };

  const pts = [
    [0.46, hips[0] * 0.97, hips[1] * 0.97, 0],
    [0.52, hips[0], hips[1], 0],
    [0.57, lerp(hips[0], waist[0], 0.55), lerp(hips[1], waist[1], 0.55), 0],
    [0.62, waist[0], waist[1], 0],
    [0.67, lerp(waist[0], chest[0], 0.5), lerp(waist[1], chest[1], 0.5), bust * 0.012],
    [0.72, chest[0], chest[1], bust * 0.028],
    [0.765, chest[0] * 0.985, chest[1] * 0.96, bust * 0.012],
    [0.795, sh * 0.88, chest[1] * 0.85, 0],
    [0.82, sh * 0.62, chest[1] * 0.6, 0],
    [0.838, neckR * 1.75, neckR * 1.4, 0],
    [0.852, neckR * 1.08, neckR * 1.05, 0],
  ].map(([y, a, b, z]) => [y * H, a, b, z]);
  const fa = monotone(pts.map((q) => [q[0], q[1]]));
  const fb = monotone(pts.map((q) => [q[0], q[2]]));
  const fz = monotone(pts.map((q) => [q[0], q[3]]));
  const torso = (y) => ({ a: fa(y), b: fb(y), oz: fz(y) });

  const thighR = (cm(p.hips) * 0.58) / TAU;
  const legX = hips[0] * 0.5;
  const legSplay = 0.04; // x per m
  const legLen = Y.legTop - Y.ankle;
  const legR = monotone([
    [0, thighR], [0.08 * H, thighR * 0.97], [0.17 * H, thighR * 0.74], [0.215 * H, thighR * 0.66],
    [0.27 * H, thighR * 0.68], [0.36 * H, thighR * 0.5], [legLen, thighR * 0.37],
  ]);
  const legDir = (side) => new THREE.Vector3(side * legSplay, -1, 0).normalize();
  const legOrigin = (side) => new THREE.Vector3(side * legX, Y.legTop, 0);

  const upperR = (cm(p.chest) * 0.29) / TAU;
  const armLen = 0.33 * H;
  const armPhi = (12 * Math.PI) / 180;
  const armR = monotone([
    [0, upperR * 1.02], [0.12 * H, upperR], [0.186 * H, upperR * 0.78],
    [0.24 * H, upperR * 0.82], [armLen, upperR * 0.5],
  ]);
  const armDir = (side) => new THREE.Vector3(side * Math.sin(armPhi), -Math.cos(armPhi), 0);
  const armOrigin = (side) => new THREE.Vector3(side * (sh - upperR * 0.95), Y.shoulder, 0);

  return {
    p, H, k: H / 1.75, Y, sh, neckR, thighR, legX, legLen, upperR, armLen, armPhi, hips,
    torso, legR, armR, legDir, legOrigin, armDir, armOrigin,
    legPoint: (side, t) => legOrigin(side).addScaledVector(legDir(side), t),
    armPoint: (side, t) => armOrigin(side).addScaledVector(armDir(side), t),
  };
}

export function torsoStations(model, y0, y1, ease, { n = 26, flare = 0, minLeg = false } = {}) {
  const out = [];
  const base = model.torso(model.Y.crotch);
  for (let i = 0; i <= n; i++) {
    const y = y0 + ((y1 - y0) * i) / n;
    let a, b, oz;
    if (y >= model.Y.crotch) ({ a, b, oz } = model.torso(y));
    else {
      const drop = model.Y.crotch - y;
      a = base.a + drop * flare; b = base.b + drop * flare; oz = base.oz;
      if (minLeg) a = Math.max(a, model.legX + model.thighR);
    }
    out.push({ t: y, a: a + ease, b: b + ease, oz });
  }
  return out;
}

export function skinMaterial(p) {
  return new THREE.MeshStandardMaterial({ color: p.skin, roughness: 0.62, metalness: 0, side: THREE.DoubleSide });
}

export function buildBody(model) {
  const { p, H, k, Y } = model;
  const g = new THREE.Group();
  g.name = 'body';
  const skin = skinMaterial(p);
  const add = (geo, mat = skin) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };

  add(loft({ stations: torsoStations(model, Y.crotch, Y.neckBase + 0.012 * H, 0, { n: 30 }), seg: 40, capStart: true }));
  // nek
  add(loft({ origin: [0, 0, 0.006], stations: [{ t: 0.83 * H, a: model.neckR, b: model.neckR * 0.95 }, { t: 0.9 * H, a: model.neckR * 0.92, b: model.neckR * 0.9 }], seg: 24 }));
  // hoofd
  const head = add(new THREE.SphereGeometry(1, 40, 28));
  head.scale.set(0.046 * H, 0.066 * H, 0.054 * H);
  head.position.set(0, H - 0.066 * H, 0.008);
  const nose = add(new THREE.SphereGeometry(1, 12, 10));
  nose.scale.set(0.008 * H, 0.011 * H, 0.012 * H);
  nose.position.set(0, H - 0.075 * H, 0.008 + 0.054 * H);
  for (const s of [-1, 1]) {
    const eye = add(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#2a2a2e', roughness: 0.3 }));
    eye.scale.setScalar(0.0045 * H);
    eye.position.set(s * 0.017 * H, H - 0.062 * H, 0.008 + 0.049 * H);
    eye.castShadow = false;
  }
  // haar
  if (p.hairStyle !== 'none') {
    const hairMat = new THREE.MeshStandardMaterial({ color: p.hair, roughness: 0.85, side: THREE.DoubleSide });
    const cap = add(new THREE.SphereGeometry(1, 40, 24, 0, TAU, 0, p.hairStyle === 'long' ? Math.PI * 0.72 : Math.PI * 0.6), hairMat);
    cap.scale.set(0.0485 * H, 0.0685 * H, 0.0575 * H);
    cap.position.set(0, H - 0.066 * H + 0.002, -0.004);
    cap.rotation.x = 0.22;
    if (p.hairStyle === 'long') {
      const back = add(new THREE.SphereGeometry(1, 28, 20), hairMat);
      back.scale.set(0.05 * H, 0.11 * H, 0.03 * H);
      back.position.set(0, H - 0.1 * H, -0.04 * H);
    }
  }
  // benen + voeten
  for (const side of [-1, 1]) {
    const o = model.legOrigin(side), d = model.legDir(side);
    const st = [];
    for (let i = 0; i <= 14; i++) { const t = (model.legLen * i) / 14; const r = model.legR(t); st.push({ t, a: r, b: r * 0.96 }); }
    add(loft({ origin: o.toArray(), dir: d.toArray(), stations: st, seg: 28, capEnd: true }));
    const ankle = model.legPoint(side, model.legLen);
    const foot = add(new THREE.SphereGeometry(1, 24, 16));
    foot.scale.set(0.04 * k, 0.034 * k, 0.12 * k);
    foot.position.set(ankle.x, 0.034 * k, 0.045 * k);
    // armen + handen
    const ao = model.armOrigin(side), ad = model.armDir(side);
    const as = [];
    for (let i = 0; i <= 12; i++) { const t = (model.armLen * i) / 12; const r = model.armR(t); as.push({ t, a: r, b: r * 0.95 }); }
    add(loft({ origin: ao.toArray(), dir: ad.toArray(), stations: as, seg: 24, capEnd: true }));
    const ball = add(new THREE.SphereGeometry(1, 20, 14));
    ball.scale.setScalar(model.armR(0) * 0.98);
    ball.position.copy(ao);
    const hand = add(new THREE.SphereGeometry(1, 20, 14));
    hand.scale.set(0.02 * k, 0.082 * k, 0.04 * k);
    hand.position.copy(model.armPoint(side, model.armLen + 0.07 * k));
    hand.rotation.z = side * model.armPhi;
  }
  return g;
}
