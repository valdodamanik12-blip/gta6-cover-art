// Cover state: layouts, grades, sizes and undo/redo history for Neon Vice Cover Studio.

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide · 1920 × 1080' },
};

// Six multi-panel layouts. Each panel is a rect in 0..1 cover space, with an
// optional tilt (degrees) for the snapshot look. Gaps are baked into the rects.
export const LAYOUTS = {
  'hero-split': {
    name: 'Hero Split',
    blurb: 'One hero panel + two stacked',
    panels: [
      { x: 0.02, y: 0.02, w: 0.60, h: 0.96 },
      { x: 0.64, y: 0.02, w: 0.34, h: 0.47 },
      { x: 0.64, y: 0.51, w: 0.34, h: 0.47 },
    ],
  },
  'four-panel': {
    name: 'Four Panel',
    blurb: 'Classic 2 × 2 poster grid',
    panels: [
      { x: 0.02, y: 0.02, w: 0.47, h: 0.47 },
      { x: 0.51, y: 0.02, w: 0.47, h: 0.47 },
      { x: 0.02, y: 0.51, w: 0.47, h: 0.47 },
      { x: 0.51, y: 0.51, w: 0.47, h: 0.47 },
    ],
  },
  'nine-grid': {
    name: 'Nine Grid',
    blurb: 'Busy 3 × 3 contact sheet',
    panels: [
      { x: 0.015, y: 0.015, w: 0.313, h: 0.313 },
      { x: 0.343, y: 0.015, w: 0.313, h: 0.313 },
      { x: 0.671, y: 0.015, w: 0.313, h: 0.313 },
      { x: 0.015, y: 0.343, w: 0.313, h: 0.313 },
      { x: 0.343, y: 0.343, w: 0.313, h: 0.313 },
      { x: 0.671, y: 0.343, w: 0.313, h: 0.313 },
      { x: 0.015, y: 0.671, w: 0.313, h: 0.313 },
      { x: 0.343, y: 0.671, w: 0.313, h: 0.313 },
      { x: 0.671, y: 0.671, w: 0.313, h: 0.313 },
    ],
  },
  triptych: {
    name: 'Triptych',
    blurb: 'Three tall columns',
    panels: [
      { x: 0.02, y: 0.02, w: 0.306, h: 0.96 },
      { x: 0.347, y: 0.02, w: 0.306, h: 0.96 },
      { x: 0.674, y: 0.02, w: 0.306, h: 0.96 },
    ],
  },
  'tilted-snaps': {
    name: 'Tilted Snaps',
    blurb: 'Pinned snapshots, askew',
    panels: [
      { x: 0.06, y: 0.05, w: 0.56, h: 0.62, rot: -3 },
      { x: 0.60, y: 0.30, w: 0.34, h: 0.42, rot: 4 },
      { x: 0.10, y: 0.66, w: 0.42, h: 0.30, rot: 2 },
    ],
  },
  'full-bleed': {
    name: 'Full Bleed',
    blurb: 'One photo, edge to edge',
    panels: [{ x: 0.0, y: 0.0, w: 1.0, h: 1.0 }],
  },
};

// Five Vice City grades. Each grade tints the photo twice (a warm wash and a
// cool shadow) and lifts saturation/contrast while it is drawn.
export const GRADES = {
  'vice-sunset': {
    name: 'Vice Sunset',
    blurb: 'Orange sky, magenta streets',
    swatch: 'linear-gradient(90deg,#ff7a1a,#ff2e88,#7b2ff7)',
    filter: 'saturate(1.3) contrast(1.1)',
    wash: ['#ff7a1a', '#ff2e88'],
    washAlpha: 0.22,
    shadow: '#2b0a4d',
    shadowAlpha: 0.18,
  },
  'neon-night': {
    name: 'Neon Night',
    blurb: 'Teal + pink after dark',
    swatch: 'linear-gradient(90deg,#19e3d6,#ff2e88,#12081d)',
    filter: 'saturate(1.35) contrast(1.15)',
    wash: ['#19e3d6', '#ff2e88'],
    washAlpha: 0.24,
    shadow: '#041a2e',
    shadowAlpha: 0.22,
  },
  'palm-gold': {
    name: 'Palm Gold',
    blurb: 'Golden hour, all day',
    swatch: 'linear-gradient(90deg,#ffc93c,#ff7a1a,#b3541e)',
    filter: 'saturate(1.25) contrast(1.06)',
    wash: ['#ffc93c', '#ff7a1a'],
    washAlpha: 0.24,
    shadow: '#3d1c05',
    shadowAlpha: 0.14,
  },
  'teal-noir': {
    name: 'Teal Noir',
    blurb: 'Cool, moody, cinematic',
    swatch: 'linear-gradient(90deg,#0f766e,#19e3d6,#0b1220)',
    filter: 'saturate(1.1) contrast(1.18)',
    wash: ['#19e3d6', '#0f766e'],
    washAlpha: 0.18,
    shadow: '#020617',
    shadowAlpha: 0.26,
  },
  'hot-pink': {
    name: 'Hot Pink',
    blurb: 'Full Miami pink overload',
    swatch: 'linear-gradient(90deg,#ff2e88,#ff5ea8,#ff7a1a)',
    filter: 'saturate(1.45) contrast(1.08)',
    wash: ['#ff2e88', '#ff7a1a'],
    washAlpha: 0.28,
    shadow: '#4d0a2b',
    shadowAlpha: 0.16,
  },
};

export const TITLE_COLORS = {
  sunset: { name: 'Sunset gradient' },
  white: { name: 'White' },
  pink: { name: 'Hot pink' },
  gold: { name: 'Gold' },
};

function defaultPanels(layoutId) {
  const count = LAYOUTS[layoutId].panels.length;
  const photos = ['sample-boulevard', 'sample-pier'];
  return Array.from({ length: count }, (_, i) => ({
    photo: photos[i % photos.length],
    zoom: 1.15 + (i % 3) * 0.08,
    ox: 0,
    oy: 0,
  }));
}

export function defaultState() {
  return {
    layout: 'hero-split',
    grade: 'vice-sunset',
    size: '1080x1080',
    title: 'VICE COAST',
    subtitle: 'Neon nights, palm dreams',
    titleColor: 'sunset',
    titlePos: 'bottom',
    grain: true,
    vignette: true,
    frame: true,
    panels: defaultPanels('hero-split'),
  };
}

// Keep panel assignments when the layout changes: reuse what fits, fill the
// rest by cycling the photos already in use.
export function panelsForLayout(state, layoutId) {
  const old = state.panels;
  const count = LAYOUTS[layoutId].panels.length;
  return Array.from({ length: count }, (_, i) => {
    if (i < old.length) return { ...old[i] };
    const donor = old[i % Math.max(old.length, 1)] || { photo: 'sample-boulevard', zoom: 1.15, ox: 0, oy: 0 };
    return { ...donor };
  });
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

// Undo/redo history over serialised states (photos live outside the state,
// keyed by id, so history stays small and never holds image bytes).
export function createHistory(initial) {
  let past = [];
  let future = [];
  let current = cloneState(initial);
  return {
    get current() { return current; },
    push(next) {
      past.push(current);
      if (past.length > 60) past.shift();
      future = [];
      current = cloneState(next);
    },
    undo() {
      if (past.length === 0) return null;
      future.push(current);
      current = past.pop();
      return cloneState(current);
    },
    redo() {
      if (future.length === 0) return null;
      past.push(current);
      current = future.pop();
      return cloneState(current);
    },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
  };
}
