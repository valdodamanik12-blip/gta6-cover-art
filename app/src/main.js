// Neon Vice Cover Studio — UI wiring: photos, panels, layouts, grades,
// caption, export and undo/redo. All work happens in the browser; photos
// are read locally and never uploaded.

import { LAYOUTS, GRADES, SIZES, defaultState, panelsForLayout, createHistory } from './state.js';
import { renderCover, panelAt } from './render.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

// ---- photos ---------------------------------------------------------------
const photos = new Map(); // id -> HTMLImageElement
const photoNames = new Map(); // id -> display name
let uploadCount = 0;
let selectedPhotoId = 'sample-boulevard';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function loadSamples() {
  const jobs = [
    ['sample-boulevard', 'samples/boulevard.jpg', 'Boulevard sample'],
    ['sample-pier', 'samples/pier.jpg', 'Pier sample'],
  ];
  for (const [id, src, name] of jobs) {
    try {
      photos.set(id, await loadImage(src));
      photoNames.set(id, name);
    } catch (err) {
      console.warn(err.message);
    }
  }
}

// ---- state ----------------------------------------------------------------
let state = defaultState();
const history = createHistory(state);
let selectedPanel = 0;

function commit(next, label) {
  state = next;
  history.push(state);
  render();
  return label;
}

// ---- rendering the preview ------------------------------------------------
const preview = $('preview');

function render() {
  renderCover(preview, state, photos);
  document.title = `${state.title || 'Neon Vice'} — Neon Vice Cover Studio`;
  syncControls();
  $('undoBtn').disabled = !history.canUndo;
  $('redoBtn').disabled = !history.canRedo;
}

function syncControls() {
  // Layout + grade buttons.
  document.querySelectorAll('#layoutGrid .layout-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('#gradeGrid .grade-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('#sizeRow .size-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.size);
  });
  document.querySelectorAll('.sample-btn').forEach((b) => {
    b.classList.toggle('selected', `sample-${b.dataset.sample}` === selectedPhotoId);
  });
  // Panel strip.
  const strip = $('panelStrip');
  strip.innerHTML = '';
  state.panels.forEach((p, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `panel-chip${i === selectedPanel ? ' active' : ''}`;
    chip.innerHTML = `Panel ${i + 1}<small>${photoNames.get(p.photo) || p.photo}</small>`;
    chip.addEventListener('click', () => {
      selectedPanel = i;
      render();
    });
    strip.appendChild(chip);
  });
  // Panel editor.
  const panel = state.panels[selectedPanel];
  $('panelLabel').textContent = `Panel ${selectedPanel + 1} of ${state.panels.length} — ${LAYOUTS[state.layout].name}`;
  const select = $('panelPhoto');
  select.innerHTML = '';
  for (const [id, name] of photoNames) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = name;
    select.appendChild(opt);
  }
  select.value = panel.photo;
  $('zoomSlider').value = panel.zoom;
  $('zoomVal').textContent = `${panel.zoom.toFixed(2)}×`;
  $('oxSlider').value = panel.ox;
  $('oxVal').textContent = panel.ox.toFixed(2);
  $('oySlider').value = panel.oy;
  $('oyVal').textContent = panel.oy.toFixed(2);
  // Caption + effects.
  if ($('titleInput').value !== state.title) $('titleInput').value = state.title;
  if ($('subtitleInput').value !== state.subtitle) $('subtitleInput').value = state.subtitle;
  $('titleColor').value = state.titleColor;
  $('titlePos').value = state.titlePos;
  $('grainCheck').checked = state.grain;
  $('vignetteCheck').checked = state.vignette;
  $('frameCheck').checked = state.frame;
  // Photo list chips.
  const list = $('photoList');
  list.innerHTML = '';
  for (const [id, name] of photoNames) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `photo-chip${id === selectedPhotoId ? ' selected' : ''}`;
    chip.textContent = name;
    chip.addEventListener('click', () => {
      selectedPhotoId = id;
      const next = JSON.parse(JSON.stringify(state));
      next.panels[selectedPanel].photo = id;
      commit(next);
    });
    list.appendChild(chip);
  }
}

// ---- controls ---------------------------------------------------------------
function buildPickers() {
  const lg = $('layoutGrid');
  for (const [id, def] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'layout-btn';
    b.dataset.layout = id;
    b.innerHTML = `${def.name}<small>${def.blurb} · ${def.panels.length} panels</small>`;
    b.addEventListener('click', () => {
      const next = JSON.parse(JSON.stringify(state));
      next.layout = id;
      next.panels = panelsForLayout(state, id);
      selectedPanel = 0;
      commit(next);
    });
    lg.appendChild(b);
  }
  const gg = $('gradeGrid');
  for (const [id, def] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'grade-btn';
    b.dataset.grade = id;
    b.innerHTML = `<span class="grade-swatch" style="background:${def.swatch}"></span>${def.name}<small>${def.blurb}</small>`;
    b.addEventListener('click', () => {
      const next = JSON.parse(JSON.stringify(state));
      next.grade = id;
      commit(next);
    });
    gg.appendChild(b);
  }
}

function bindControls() {
  document.querySelectorAll('.sample-btn').forEach((b) => {
    b.addEventListener('click', () => {
      selectedPhotoId = `sample-${b.dataset.sample}`;
      const next = JSON.parse(JSON.stringify(state));
      next.panels[selectedPanel].photo = selectedPhotoId;
      commit(next);
    });
  });

  $('photoInput').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      const id = `up-${++uploadCount}`;
      const url = URL.createObjectURL(file);
      try {
        photos.set(id, await loadImage(url));
        photoNames.set(id, file.name.replace(/\.[^.]+$/, '') || 'Your photo');
        selectedPhotoId = id;
      } catch {
        URL.revokeObjectURL(url);
      }
    }
    e.target.value = '';
    const next = JSON.parse(JSON.stringify(state));
    next.panels[selectedPanel].photo = selectedPhotoId;
    commit(next);
  });

  $('fillAllBtn').addEventListener('click', () => {
    const next = JSON.parse(JSON.stringify(state));
    next.panels.forEach((p) => { p.photo = selectedPhotoId; });
    commit(next);
  });

  $('panelPhoto').addEventListener('change', (e) => {
    selectedPhotoId = e.target.value;
    const next = JSON.parse(JSON.stringify(state));
    next.panels[selectedPanel].photo = e.target.value;
    commit(next);
  });

  // Sliders render live; the history entry lands when the drag ends.
  const slider = (id, key) => {
    const el = $(id);
    el.addEventListener('input', () => {
      state.panels[selectedPanel][key] = parseFloat(el.value);
      render();
    });
    el.addEventListener('change', () => {
      history.push(state);
      render();
    });
  };
  slider('zoomSlider', 'zoom');
  slider('oxSlider', 'ox');
  slider('oySlider', 'oy');

  $('titleInput').addEventListener('input', (e) => {
    state.title = e.target.value;
    render();
  });
  $('titleInput').addEventListener('change', () => { history.push(state); render(); });
  $('subtitleInput').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    render();
  });
  $('subtitleInput').addEventListener('change', () => { history.push(state); render(); });
  $('titleColor').addEventListener('change', (e) => {
    const next = JSON.parse(JSON.stringify(state));
    next.titleColor = e.target.value;
    commit(next);
  });
  $('titlePos').addEventListener('change', (e) => {
    const next = JSON.parse(JSON.stringify(state));
    next.titlePos = e.target.value;
    commit(next);
  });
  for (const [id, key] of [['grainCheck', 'grain'], ['vignetteCheck', 'vignette'], ['frameCheck', 'frame']]) {
    $(id).addEventListener('change', (e) => {
      const next = JSON.parse(JSON.stringify(state));
      next[key] = e.target.checked;
      commit(next);
    });
  }

  document.querySelectorAll('#sizeRow .size-btn').forEach((b) => {
    b.addEventListener('click', () => {
      const next = JSON.parse(JSON.stringify(state));
      next.size = b.dataset.size;
      commit(next);
    });
  });

  preview.addEventListener('click', (e) => {
    const r = preview.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    const hit = panelAt(state, nx, ny);
    if (hit >= 0) {
      selectedPanel = hit;
      selectedPhotoId = state.panels[hit].photo;
      render();
    }
  });

  $('undoBtn').addEventListener('click', doUndo);
  $('redoBtn').addEventListener('click', doRedo);
  $('resetBtn').addEventListener('click', () => {
    state = defaultState();
    selectedPanel = 0;
    selectedPhotoId = 'sample-boulevard';
    history.push(state);
    render();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      doUndo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault();
      doRedo();
    }
  });

  $('exportBtn').addEventListener('click', () => exportCover(state.size, true));
  $('exportAllBtn').addEventListener('click', async () => {
    for (const key of Object.keys(SIZES)) {
      await exportCover(key, false);
      await new Promise((r) => setTimeout(r, 150));
    }
    await exportCover(state.size, true);
  });
  $('lightboxClose').addEventListener('click', () => { $('lightbox').hidden = true; });
  $('lightbox').addEventListener('click', (e) => {
    if (e.target === $('lightbox')) $('lightbox').hidden = true;
  });
}

function doUndo() {
  const prev = history.undo();
  if (prev) {
    state = prev;
    selectedPanel = Math.min(selectedPanel, state.panels.length - 1);
    render();
  }
}
function doRedo() {
  const next = history.redo();
  if (next) {
    state = next;
    selectedPanel = Math.min(selectedPanel, state.panels.length - 1);
    render();
  }
}

// ---- export -----------------------------------------------------------------
function exportCover(sizeKey, show) {
  return new Promise((resolve) => {
    const out = document.createElement('canvas');
    const savedSize = state.size;
    const exportState = JSON.parse(JSON.stringify(state));
    exportState.size = sizeKey;
    renderCover(out, exportState, photos);
    state.size = savedSize;
    out.toBlob((blob) => {
      if (!blob) { resolve(null); return; }
      const url = URL.createObjectURL(blob);
      const size = SIZES[sizeKey];
      const name = `neon-vice-cover-${sizeKey}.png`;
      if (show) {
        $('lightboxLabel').textContent = `Your cover — ${size.label} · PNG, ${(blob.size / 1024).toFixed(0)} KiB`;
        const img = $('lightboxImg');
        img.src = url;
        const dl = $('lightboxDownload');
        dl.href = url;
        dl.download = name;
        $('lightbox').hidden = false;
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      resolve({ sizeKey, bytes: blob.size, url });
    }, 'image/png');
  });
}

// ---- boot -------------------------------------------------------------------
function applyShotParams() {
  if (params.get('layout') && LAYOUTS[params.get('layout')]) {
    state.layout = params.get('layout');
    state.panels = panelsForLayout(state, state.layout);
  }
  if (params.get('grade') && GRADES[params.get('grade')]) state.grade = params.get('grade');
  if (params.get('size') && SIZES[params.get('size')]) state.size = params.get('size');
  if (params.get('title')) state.title = params.get('title').slice(0, 24);
  if (params.get('subtitle')) state.subtitle = params.get('subtitle').slice(0, 48);
  if (params.get('shot') === 'cover') document.body.classList.add('shot-cover');
}

async function boot() {
  buildPickers();
  bindControls();
  applyShotParams();
  await loadSamples();
  render();
  window.__nv = {
    get state() { return state; },
    exportCover,
    photos,
    render,
  };
  window.__nvReady = true;
}

boot();
