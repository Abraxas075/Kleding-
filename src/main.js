import './style.css';
import bookmarkletRaw from './bookmarklet.raw.js?raw';
import { createViewer } from './viewer.js';
import { buildAvatar } from './avatar.js';
import { TYPES, PATTERNS, conflicts } from './catalog.js';
import { SIZES, fitFor, bodySizeIndex } from './sizing.js';
import { guessType, guessColor, guessPattern, guessSize, dominantColor } from './classify.js';
import { PRESETS, DEMO_ITEMS, loadState, saveState, uid } from './store.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const state = loadState();
const viewer = createViewer($('#viewer'));
viewer.frame(state.profile.height / 100);

// ---------- 3D ----------
let raf = 0;
function rebuild() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    viewer.setAvatar(buildAvatar(state.profile, state.items));
    renderOutfit();
  });
}
function commit({ ui = false } = {}) {
  saveState(state);
  rebuild();
  if (ui) renderCart();
}

// ---------- items ----------
function makeItem(raw) {
  const text = [raw.name, raw.text, raw.color].filter(Boolean).join(' ');
  const type = raw.type && TYPES[raw.type] ? raw.type : guessType(raw.name + ' ' + (raw.text || ''));
  const guessed = guessColor(raw.color || '') || guessColor(raw.name || '') || guessColor(text);
  return {
    id: uid(), name: (raw.name || 'Kledingstuk').slice(0, 140), image: raw.image || '', price: raw.price || '', url: raw.url || '',
    type, color: raw.color && /^#/.test(raw.color) ? raw.color : guessed || (type === 'jeans' ? '#3f5f8f' : '#8d9096'),
    colorAuto: !guessed && !(raw.color && /^#/.test(raw.color)),
    pattern: raw.pattern || guessPattern(text), size: SIZES.includes(raw.size) ? raw.size : guessSize(raw.size || raw.name) || '', worn: false,
  };
}
function addItems(list) {
  const added = [];
  for (const raw of list) {
    if (state.items.some((i) => i.image && i.image === raw.image && i.name === raw.name)) continue;
    const it = makeItem(raw);
    if (!it.size) it.size = SIZES[bodySizeIndex(state.profile, TYPES[it.type].slot === 'bottom' ? 'bottom' : 'top')];
    state.items.push(it);
    added.push(it);
    if (it.colorAuto && it.image) dominantColor(it.image).then((hex) => {
      if (hex && it.colorAuto) { it.color = hex; commit({ ui: true }); }
    });
  }
  return added;
}
function wear(item, on) {
  if (on) for (const o of state.items) if (o !== item && o.worn && conflicts(TYPES[o.type].slot, TYPES[item.type].slot)) o.worn = false;
  item.worn = on;
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 3200);
}

// ---------- cart tab ----------
function renderCart() {
  const pane = $('#pane-cart');
  const worn = state.items.filter((i) => i.worn);
  const cards = state.items.map((it) => {
    const type = TYPES[it.type];
    const fit = fitFor(it, state.profile, type);
    const sizeOpts = SIZES.map((s) => `<option ${s === it.size ? 'selected' : ''}>${s}</option>`).join('');
    return `<li class="card ${it.worn ? 'on' : ''}" data-id="${it.id}">
      <div class="thumb" style="background-image:url('${esc(it.image)}')" role="img" aria-label="${esc(it.name)}"></div>
      <div class="meta">
        <b title="${esc(it.name)}">${esc(it.name)}</b>
        <div class="row"><select data-f="type" aria-label="Soort">${Object.entries(TYPES).map(([k, t]) => `<option value="${k}" ${k === it.type ? 'selected' : ''}>${t.label}</option>`).join('')}</select>
          ${type.slot === 'shoes' ? '' : `<select data-f="size" aria-label="Maat">${sizeOpts}</select>`}</div>
        <div class="row"><input type="color" data-f="color" value="${esc(it.color)}" aria-label="Kleur" />
          <select data-f="pattern" aria-label="Patroon">${Object.entries(PATTERNS).map(([k, v]) => `<option value="${k}" ${k === it.pattern ? 'selected' : ''}>${v}</option>`).join('')}</select>
          ${fit.label && it.worn ? `<span class="fit ${fit.tone}" title="Jouw maat volgens je lichaamsmaten: ${fit.advice}">${fit.label}</span>` : ''}</div>
        <small>${esc(it.price)}</small>
      </div>
      <div class="actions"><button class="btn ${it.worn ? 'primary' : ''}" data-act="toggle">${it.worn ? 'Aan ✓' : 'Pas aan'}</button><button class="btn" data-act="del" aria-label="Verwijderen">✕</button></div>
    </li>`;
  }).join('');
  const sum = worn.reduce((s, i) => s + (parseFloat(String(i.price).replace(/[^\d,.]/g, '').replace(',', '.')) || 0), 0);
  pane.innerHTML = state.items.length
    ? `<div class="row"><button class="btn" data-act="all">Alles passen</button><button class="btn" data-act="none">Alles uit</button><button class="btn" data-act="clear">Mand leegmaken</button></div>
       <ul class="cards">${cards}</ul>
       ${worn.length ? `<div class="total"><span>Outfit (${worn.length})</span><span>${sum ? '€ ' + sum.toFixed(2).replace('.', ',') : ''}</span></div>` : ''}`
    : `<div class="empty"><p><b>Je mand is leeg.</b></p><p>Importeer je winkelmand vanuit een webshop via het tabblad <b>Importeren</b>, of probeer eerst een demo.</p>
       <p><button class="btn primary" data-act="demo">Demo-mand laden</button></p></div>`;
}
$('#pane-cart').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  const li = btn.closest('.card');
  const item = li && state.items.find((i) => i.id === li.dataset.id);
  if (act === 'toggle' && item) wear(item, !item.worn);
  else if (act === 'del' && item) state.items.splice(state.items.indexOf(item), 1);
  else if (act === 'demo') { addItems(DEMO_ITEMS); for (const n of ['shirt', 'jeans', 'shoes']) { const it = state.items.find((i) => i.type === n); if (it) wear(it, true); } }
  else if (act === 'all') { for (const it of state.items) if (!it.worn && !state.items.some((o) => o.worn && conflicts(TYPES[o.type].slot, TYPES[it.type].slot))) wear(it, true); }
  else if (act === 'none') state.items.forEach((i) => { i.worn = false; });
  else if (act === 'clear') { if (!confirm('Alle items uit de mand verwijderen?')) return; state.items = []; }
  commit({ ui: true });
});
$('#pane-cart').addEventListener('input', (e) => {
  const f = e.target.dataset.f, li = e.target.closest('.card');
  const item = li && state.items.find((i) => i.id === li.dataset.id);
  if (!item || !f) return;
  item[f] = e.target.value;
  if (f === 'color') item.colorAuto = false;
  if (f === 'type' && TYPES[item.type].slot !== 'shoes') { /* maat blijft */ }
  if (f === 'type' && item.worn) { item.worn = false; wear(item, true); }
  commit({ ui: f !== 'color' });
});

function renderOutfit() {
  $('#outfit').innerHTML = state.items.filter((i) => i.worn).map((i) => `<span class="chip"><i style="background:${esc(i.color)}"></i>${esc(TYPES[i.type].label)}${i.size && TYPES[i.type].slot !== 'shoes' ? ' · ' + esc(i.size) : ''}</span>`).join('');
}

// ---------- body tab ----------
const FIELDS = [['height', 'Lengte', 150, 205], ['shoulders', 'Schouders', 33, 56], ['chest', 'Borst', 70, 135], ['waist', 'Taille', 55, 130], ['hips', 'Heupen', 75, 140]];
const SKIN = ['#f6d7c3', '#e3b393', '#c68c63', '#a3683f', '#7a4a2d', '#4f2f1e'];
const HAIR = ['#1a1412', '#3a2a20', '#7a4e2b', '#b5772f', '#d9b86c', '#9aa0a6', '#b4402d'];
function renderBody() {
  const p = state.profile;
  $('#pane-body').innerHTML = `
    <h2>Basis</h2>
    <div class="row">${Object.keys(PRESETS).map((k) => `<button class="btn" data-preset="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>
    <h2>Lichaamsmaten (cm)</h2>
    ${FIELDS.map(([k, l, min, max]) => `<label class="field"><span>${l}</span><input type="range" min="${min}" max="${max}" value="${p[k]}" data-k="${k}"><output>${p[k]}</output></label>`).join('')}
    <label class="field"><span>Bustevorm</span><input type="range" min="0" max="1" step="0.1" value="${p.bust}" data-k="bust"><output>${p.bust}</output></label>
    <p class="note" id="size-hint"></p>
    <h2>Uiterlijk</h2>
    <p class="note">Huidskleur</p><div class="swatches" data-sw="skin">${SKIN.map((c) => `<button style="background:${c}" data-c="${c}" aria-pressed="${p.skin === c}" aria-label="Huidskleur ${c}"></button>`).join('')}</div>
    <p class="note">Haar</p>
    <div class="row"><select id="hair-style"><option value="short">Kort</option><option value="long">Lang</option><option value="none">Kaal</option></select></div>
    <div class="swatches" data-sw="hair" style="margin-top:8px">${HAIR.map((c) => `<button style="background:${c}" data-c="${c}" aria-pressed="${p.hair === c}" aria-label="Haarkleur ${c}"></button>`).join('')}</div>
    <p class="note" style="margin-top:18px">Je maten blijven alleen in deze browser (localStorage) staan en worden nergens heen gestuurd.</p>`;
  $('#hair-style').value = p.hairStyle;
  updateSizeHint();
}
function updateSizeHint() {
  const el = $('#size-hint');
  if (el) el.textContent = `Op basis van je maten: bovenkleding ${SIZES[bodySizeIndex(state.profile, 'top')]}, broeken ${SIZES[bodySizeIndex(state.profile, 'bottom')]}.`;
}
$('#pane-body').addEventListener('input', (e) => {
  const k = e.target.dataset.k;
  if (k) { state.profile[k] = +e.target.value; e.target.nextElementSibling.textContent = e.target.value; updateSizeHint(); commit(); }
  if (e.target.id === 'hair-style') { state.profile.hairStyle = e.target.value; commit(); }
});
$('#pane-body').addEventListener('click', (e) => {
  const pre = e.target.closest('[data-preset]');
  if (pre) { Object.assign(state.profile, PRESETS[pre.dataset.preset]); renderBody(); renderCart(); viewer.frame(state.profile.height / 100); commit(); return; }
  const sw = e.target.closest('[data-c]');
  if (sw) { state.profile[sw.parentElement.dataset.sw] = sw.dataset.c; renderBody(); commit(); }
});

// ---------- import tab ----------
function bookmarkletHref() {
  const app = location.origin + location.pathname;
  const src = bookmarkletRaw.replace('__APP__', app).replace(/\n\s*/g, '\n');
  return 'javascript:' + encodeURIComponent(src);
}
function renderImport() {
  $('#pane-import').innerHTML = `
    <h2>Uit je webshop</h2>
    <ol class="steps">
      <li>Sleep deze knop naar je bladwijzerbalk: <a class="bm" id="bm" title="Sleep naar je bladwijzerbalk">➜ 3D-paskamer</a></li>
      <li>Open je <b>winkelmand</b> (of een productpagina) in de webshop.</li>
      <li>Klik op de bladwijzer, vink de items aan en kies <i>Naar 3D-paskamer</i>.</li>
    </ol>
    <p class="note">De gegevens gaan via de URL-hash van je browser rechtstreeks naar deze pagina; er is geen server. Sommige webshops blokkeren bladwijzer-scripts (CSP) – gebruik dan de handmatige invoer hieronder.</p>
    <h2>Handmatig toevoegen</h2>
    <form class="form" id="add-form">
      <input name="name" placeholder="Productnaam, bv. 'Gestreepte navy trui'" required />
      <input name="image" type="url" placeholder="Afbeeldings-URL (optioneel, rechtsklik › afbeeldingsadres kopiëren)" />
      <div class="row"><input name="price" placeholder="Prijs" style="flex:1" /><select name="size" style="flex:1"><option value="">Maat…</option>${SIZES.map((s) => `<option>${s}</option>`).join('')}</select></div>
      <button class="btn primary" type="submit">Toevoegen aan mand</button>
    </form>
    <p class="note">Soort, kleur en patroon worden uit de naam geraden en kun je daarna aanpassen.</p>
    <h2>Mand plakken (JSON)</h2>
    <form class="form" id="json-form"><textarea name="json" rows="4" placeholder='[{"name":"Zwarte jeans","image":"https://…","size":"M"}]'></textarea><button class="btn" type="submit">Importeren</button></form>`;
  $('#bm').href = bookmarkletHref();
}
$('#pane-import').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  let list;
  if (f.id === 'add-form') list = [Object.fromEntries(new FormData(f))];
  else { try { const j = JSON.parse(f.json.value); list = Array.isArray(j) ? j : j.items; } catch { return toast('Ongeldige JSON'); } }
  const added = addItems(list || []);
  f.reset();
  switchTab('cart');
  toast(`${added.length} item(s) toegevoegd`);
  commit({ ui: true });
});
$('#pane-import').addEventListener('click', (e) => { if (e.target.id === 'bm') { e.preventDefault(); toast('Sleep deze knop naar je bladwijzerbalk i.p.v. klikken'); } });

// ---------- tabs / toolbar ----------
function switchTab(name) {
  document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  document.querySelectorAll('.pane').forEach((p) => { p.hidden = p.id !== 'pane-' + name; });
}
document.querySelector('.tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) switchTab(b.dataset.tab); });
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => viewer.frame(state.profile.height / 100, +b.dataset.view)));
$('#spin').addEventListener('click', (e) => { const on = !viewer.autoRotate; viewer.setAutoRotate(on); e.currentTarget.setAttribute('aria-pressed', String(on)); });
$('#shot').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = viewer.screenshot();
  a.download = '3d-paskamer.png';
  a.click();
});

// ---------- import via URL-hash ----------
function importFromHash() {
  const m = location.hash.match(/^#cart=(.+)$/);
  if (!m) return;
  try {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    const added = addItems((data.items || []).filter((i) => i && i.name));
    history.replaceState(null, '', location.pathname + location.search);
    if (added.length) toast(`${added.length} item(s) uit ${data.site || 'de webshop'} toegevoegd – zet "Pas aan" aan`);
  } catch { toast('Kon de winkelmand niet lezen'); }
}

renderCart(); renderBody(); renderImport();
importFromHash();
commit({ ui: true });
addEventListener('hashchange', () => { importFromHash(); commit({ ui: true }); });
