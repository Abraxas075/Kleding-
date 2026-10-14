import * as THREE from 'three';

// Monotone kubische interpolatie (Fritsch–Carlson): glad en zonder overshoot.
export function monotone(points) {
  const n = points.length;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const d = [];
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
  const m = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i]
      + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

/**
 * Lofted buis met elliptische doorsneden langs een rechte as.
 * stations: [{t, a, b, ox?, oz?}] oplopend in t; a = halve breedte, b = halve diepte (richting +z).
 */
export function loft({ origin = [0, 0, 0], dir = [0, 1, 0], stations, seg = 36, capStart = false, capEnd = false }) {
  const o = new THREE.Vector3(...origin);
  const d = new THREE.Vector3(...dir).normalize();
  const f = new THREE.Vector3(0, 0, 1);
  const s = new THREE.Vector3().crossVectors(d, f).normalize();
  const rows = stations.length, cols = seg + 1;
  const pos = [], uv = [], idx = [];
  const t0 = stations[0].t, t1 = stations[rows - 1].t;
  const ring = (st) => {
    const out = [];
    const c = o.clone().addScaledVector(d, st.t);
    for (let j = 0; j <= seg; j++) {
      const th = (j / seg) * Math.PI * 2;
      const x = (st.ox || 0) + st.a * Math.cos(th);
      const z = (st.oz || 0) + st.b * Math.sin(th);
      out.push(c.clone().addScaledVector(s, x).addScaledVector(f, z));
    }
    return out;
  };
  for (let i = 0; i < rows; i++) {
    const r = ring(stations[i]);
    for (let j = 0; j < cols; j++) {
      pos.push(r[j].x, r[j].y, r[j].z);
      uv.push(j / seg, (stations[i].t - t0) / (t1 - t0 || 1));
    }
  }
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * cols + j, b = a + 1, c = (i + 1) * cols + j + 1, e = (i + 1) * cols + j;
    idx.push(a, e, b, b, e, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // naad gladstrijken
  const n = g.getAttribute('normal');
  for (let i = 0; i < rows; i++) {
    const a = i * cols, b = a + seg;
    const v = new THREE.Vector3(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
    n.setXYZ(a, v.x, v.y, v.z);
    n.setXYZ(b, v.x, v.y, v.z);
  }
  const parts = [g];
  const cap = (st, flip) => {
    const r = ring(st);
    const c = o.clone().addScaledVector(d, st.t).addScaledVector(s, st.ox || 0).addScaledVector(f, st.oz || 0);
    const p = [c.x, c.y, c.z], ix = [];
    r.forEach((v) => p.push(v.x, v.y, v.z));
    for (let j = 0; j < seg; j++) ix.push(0, flip ? j + 2 : j + 1, flip ? j + 1 : j + 2);
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    cg.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((r.length + 1) * 2).fill(0), 2));
    cg.setIndex(ix);
    cg.computeVertexNormals();
    parts.push(cg);
  };
  if (capStart) cap(stations[0], true);
  if (capEnd) cap(stations[rows - 1], false);
  return parts.length === 1 ? g : mergeGeos(parts);
}

function mergeGeos(list) {
  const pos = [], nor = [], uv = [], idx = [];
  let off = 0;
  for (const g of list) {
    const p = g.getAttribute('position'), n = g.getAttribute('normal'), u = g.getAttribute('uv');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      uv.push(u.getX(i), u.getY(i));
    }
    const ix = g.getIndex();
    for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + off);
    off += p.count;
    g.dispose();
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  m.setIndex(idx);
  return m;
}
