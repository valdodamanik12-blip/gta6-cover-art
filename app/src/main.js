// Palm Coast Cover Studio: wires the editor UI to the cover engine.
// Photos are read on this machine only (FileReader / object URLs) and never uploaded.
// ?shot= switches to a fixed screenshot scene (see ./shots.js).

import { drawCover, GRADES, LAYOUTS, SIZES } from './cover.js';
import { cloneState, CoverHistory, defaultState, panelsForLayout } from './state.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const trayEl = document.getElementById('tray');
const panelListEl = document.getElementById('panelList');
const layoutsEl = document.getElementById('layouts');
const gradesEl = document.getElementById('grades');
const sizesEl = document.getElementById('sizes');
const heatEl = document.getElementById('heatStars');

const history = new CoverHistory(defaultState());
let state = history.current;
let photos = []; // { name, img } — images live only in this page
let selectedPanel = 0;
let pickedPhoto = 0;

function setStatus(text) { statusEl.textContent = text; }

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Adds an already-loaded image to the tray and returns its index. */
export function addPhoto(name, img) {
  photos.push({ name, img });
  pickedPhoto = photos.length - 1;
  buildTray();
  return photos.length - 1;
}

/** Loads a sample (or any local URL) into the tray. */
export async function loadSample(url) {
  const img = await loadImage(url);
  return addPhoto(url.split('/').pop(), img);
}

/** Commits the current state to history after a completed change. */
function commit() {
  history.push(state);
  syncUndoRedo();
}

function syncUndoRedo() {
  document.getElementById('undo').disabled = !history.canUndo;
  document.getElementById('redo').disabled = !history.canRedo;
}

/** Preview resolution for the chosen export aspect (the export itself is full-size). */
function previewSize() {
  const s = SIZES[state.size];
  // In a cover screenshot scene the canvas fills the frame: draw at export size.
  if (document.body.classList.contains('shot-cover')) return { w: s.w, h: s.h };
  const scale = 720 / Math.max(s.w, s.h);
  return { w: Math.round(s.w * scale), h: Math.round(s.h * scale) };
}

/** Redraws the preview canvas from the current state and photos. */
export function render() {
  const { w, h } = previewSize();
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  drawCover(canvas, { ...state, photos: photos.map((p) => p.img) });
  document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#grades .swatch').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('#sizes button').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  document.querySelectorAll('#heatStars button').forEach((b, i) => b.classList.toggle('lit', i < state.heat));
}

/** Rebuilds the photo tray thumbnails. */
function buildTray() {
  trayEl.innerHTML = '';
  if (!photos.length) {
    const empty = document.createElement('span');
    empty.className = 'empty';
    empty.textContent = 'No photos yet — add yours or load a sample.';
    trayEl.append(empty);
    return;
  }
  photos.forEach((p, i) => {
    const thumb = document.createElement('img');
    thumb.src = p.img.src;
    thumb.alt = p.name;
    thumb.title = p.name;
    thumb.classList.toggle('picked', i === pickedPhoto);
    thumb.addEventListener('click', () => {
      pickedPhoto = i;
      buildTray();
      setStatus(`Photo ${i + 1} picked — click a panel to place it.`);
    });
    trayEl.append(thumb);
  });
}

/** Rebuilds the per-panel editor rows for the current layout. */
function buildPanelList() {
  panelListEl.innerHTML = '';
  const rects = (LAYOUTS[state.layout] || LAYOUTS.poster).panels();
  rects.forEach((_, i) => {
    const panel = state.panels[i];
    const row = document.createElement('div');
    row.className = 'panel-row' + (i === selectedPanel ? ' selected' : '');
    row.addEventListener('click', () => { selectedPanel = i; buildPanelList(); render(); });

    const head = document.createElement('div');
    head.className = 'row-head';
    head.textContent = `Panel ${i + 1}`;
    const place = document.createElement('button');
    place.type = 'button';
    place.textContent = 'Place picked photo';
    place.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.photo = pickedPhoto;
      selectedPanel = i;
      commit();
      buildPanelList();
      render();
    });
    head.append(place);
    row.append(head);

    const select = document.createElement('select');
    select.setAttribute('aria-label', `Photo for panel ${i + 1}`);
    const none = document.createElement('option');
    none.value = '';
    none.textContent = 'Empty panel';
    select.append(none);
    photos.forEach((p, pi) => {
      const opt = document.createElement('option');
      opt.value = String(pi);
      opt.textContent = `Photo ${pi + 1} — ${p.name}`;
      select.append(opt);
    });
    select.value = panel.photo == null ? '' : String(panel.photo);
    select.addEventListener('change', () => {
      panel.photo = select.value === '' ? null : Number(select.value);
      commit();
      render();
    });
    select.addEventListener('click', (e) => e.stopPropagation());
    row.append(select);

    const sliders = document.createElement('div');
    sliders.className = 'sliders';
    const addSlider = (label, min, max, step, value, onInput) => {
      const lab = document.createElement('span');
      lab.textContent = label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = min; input.max = max; input.step = step; input.value = value;
      input.setAttribute('aria-label', `${label} for panel ${i + 1}`);
      input.addEventListener('input', () => onInput(Number(input.value)));
      input.addEventListener('change', commit);
      input.addEventListener('click', (e) => e.stopPropagation());
      sliders.append(lab, input);
    };
    addSlider('Zoom', 1, 3, 0.01, panel.zoom, (v) => { panel.zoom = v; render(); });
    addSlider('Move ↔', -0.5, 0.5, 0.01, panel.ox, (v) => { panel.ox = v; render(); });
    addSlider('Move ↕', -0.5, 0.5, 0.01, panel.oy, (v) => { panel.oy = v; render(); });
    row.append(sliders);
    panelListEl.append(row);
  });
}

/** Builds the layout / grade / size / heat button groups. */
function buildOptionGroups() {
  Object.entries(LAYOUTS).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = key;
    b.textContent = def.label;
    b.addEventListener('click', () => {
      const old = state.panels;
      state.layout = key;
      state.panels = panelsForLayout(key).map((p, i) => (old[i] ? { ...p, photo: old[i].photo, zoom: old[i].zoom } : p));
      selectedPanel = 0;
      commit();
      buildPanelList();
      render();
    });
    layoutsEl.append(b);
  });
  Object.entries(GRADES).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.dataset.grade = key;
    b.style.background = def.swatch;
    b.title = def.label;
    b.setAttribute('aria-label', `Grade ${def.label}`);
    const label = document.createElement('span');
    label.textContent = def.label;
    b.append(label);
    b.addEventListener('click', () => {
      state.grade = key;
      commit();
      render();
    });
    gradesEl.append(b);
  });
  Object.entries(SIZES).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.size = key;
    b.textContent = def.label;
    b.addEventListener('click', () => {
      state.size = key;
      render();
    });
    sizesEl.append(b);
  });
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = '★';
    b.setAttribute('aria-label', `Heat ${i}`);
    b.addEventListener('click', () => {
      state.heat = i;
      commit();
      render();
    });
    heatEl.append(b);
  }
}

/** Exports the cover at the given size as a PNG file download. */
export function exportPNG(sizeKey) {
  const s = SIZES[sizeKey] || SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = s.w;
  off.height = s.h;
  drawCover(off, { ...state, photos: photos.map((p) => p.img) });
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `palm-coast-cover-${s.w}x${s.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus(`Saved palm-coast-cover-${s.w}x${s.h}.png (${s.w} × ${s.h})`);
      resolve(blob);
    }, 'image/png');
  });
}

// --- Wiring: uploads, words, undo/redo, export, canvas drag & zoom ---

document.getElementById('addPhotos').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const img = await loadImage(URL.createObjectURL(file));
    addPhoto(file.name, img);
  }
  buildPanelList();
  render();
  setStatus(`${e.target.files.length} photo(s) added — all local, nothing uploaded.`);
  e.target.value = '';
});
document.querySelectorAll('[data-sample]').forEach((b) => {
  b.addEventListener('click', async () => {
    await loadSample(b.dataset.sample);
    buildPanelList();
    render();
    setStatus(`Sample ${b.dataset.sample.split('/').pop()} loaded.`);
  });
});

const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const badgeInput = document.getElementById('badge');
titleInput.addEventListener('input', () => { state.title = titleInput.value; render(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; render(); });
badgeInput.addEventListener('input', () => { state.badge = badgeInput.value; render(); });
[titleInput, subtitleInput, badgeInput].forEach((el) => el.addEventListener('change', commit));
document.getElementById('grain').addEventListener('change', (e) => { state.grain = e.target.checked; commit(); render(); });
document.getElementById('vignette').addEventListener('change', (e) => { state.vignette = e.target.checked; commit(); render(); });

document.getElementById('undo').addEventListener('click', () => {
  const prev = history.undo();
  if (prev) { state = prev; syncInputs(); buildPanelList(); render(); syncUndoRedo(); }
});
document.getElementById('redo').addEventListener('click', () => {
  const next = history.redo();
  if (next) { state = next; syncInputs(); buildPanelList(); render(); syncUndoRedo(); }
});

document.getElementById('export').addEventListener('click', () => exportPNG(state.size));
document.getElementById('exportAll').addEventListener('click', async () => {
  for (const key of Object.keys(SIZES)) {
    await exportPNG(key);
    await new Promise((r) => setTimeout(r, 250));
  }
});

function syncInputs() {
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  badgeInput.value = state.badge;
  document.getElementById('grain').checked = state.grain;
  document.getElementById('vignette').checked = state.vignette;
}

// Drag a panel's photo to move it; scroll over the canvas to zoom it.
let drag = null;
function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const nx = (clientX - rect.left) / rect.width;
  const ny = (clientY - rect.top) / rect.height;
  const rects = (LAYOUTS[state.layout] || LAYOUTS.poster).panels();
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (nx >= r.x && nx <= r.x + r.w && ny >= r.y && ny <= r.y + r.h) return i;
  }
  return -1;
}
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  selectedPanel = i;
  buildPanelList();
  render();
  const panel = state.panels[i];
  drag = { i, x: e.clientX, y: e.clientY, ox: panel.ox, oy: panel.oy };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const r = (LAYOUTS[state.layout] || LAYOUTS.poster).panels()[drag.i];
  const panel = state.panels[drag.i];
  panel.ox = drag.ox + ((e.clientX - drag.x) / rect.width) / r.w;
  panel.oy = drag.oy + ((e.clientY - drag.y) / rect.height) / r.h;
  panel.ox = Math.max(-0.8, Math.min(0.8, panel.ox));
  panel.oy = Math.max(-0.8, Math.min(0.8, panel.oy));
  render();
});
canvas.addEventListener('pointerup', () => { if (drag) { drag = null; commit(); } });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[selectedPanel];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (1 - e.deltaY * 0.001)));
  render();
  clearTimeout(canvas._zoomTimer);
  canvas._zoomTimer = setTimeout(commit, 400);
}, { passive: false });

// --- Boot ---

buildOptionGroups();
buildTray();
buildPanelList();
syncUndoRedo();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    loadSample,
    setState(patch) { state = { ...state, ...patch }; syncInputs(); buildPanelList(); },
    setPanels(panels) { state.panels = panels; buildPanelList(); },
    render,
    exportPNG,
    getState: () => state,
  });
} else {
  Promise.all([loadSample('samples/boulevard.jpg'), loadSample('samples/pier.jpg')]).then(() => {
    buildPanelList();
    render();
  });
  render();
}

// Handle for automated checks (screenshots, finalist review).
window.__studio = { getState: () => state, photos: () => photos, render, exportPNG };
