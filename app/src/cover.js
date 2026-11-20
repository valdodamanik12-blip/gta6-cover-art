// Palm Coast cover engine: draws a GTA-poster-style multi-panel cover on any 2D canvas.
// Everything is drawn from the state object, so the editor preview and the exported PNG
// are the same picture at different resolutions. No fonts or images are loaded from the
// network: lettering uses heavy system sans-serif with hand-drawn outlines and glows.

export const SIZES = {
  square: { label: '1080 × 1080', w: 1080, h: 1080 },
  portrait: { label: '1080 × 1350', w: 1080, h: 1350 },
  wide: { label: '1920 × 1080', w: 1920, h: 1080 },
};

export const GRADES = {
  sunset: {
    label: 'Sunset',
    swatch: 'linear-gradient(135deg,#ff7a18,#ff2e88 55%,#7b2ff7)',
    filter: 'saturate(1.3) contrast(1.08) brightness(1.03) sepia(0.16) hue-rotate(-8deg)',
    washTop: 'rgba(255,122,24,0.10)', washBottom: 'rgba(255,46,136,0.30)',
    glow: 'rgba(255,150,60,0.55)', titleShadow: '#ff2e88',
  },
  neon: {
    label: 'Neon Night',
    swatch: 'linear-gradient(135deg,#19e3d6,#ff2e88 60%,#1a1440)',
    filter: 'saturate(1.65) contrast(1.16) brightness(0.96) hue-rotate(12deg)',
    washTop: 'rgba(25,227,214,0.12)', washBottom: 'rgba(255,46,136,0.32)',
    glow: 'rgba(255,46,136,0.6)', titleShadow: '#19e3d6',
  },
  teal: {
    label: 'Teal Heat',
    swatch: 'linear-gradient(135deg,#0fb5a6,#ffb347 60%,#123a5c)',
    filter: 'saturate(1.25) contrast(1.12) brightness(1.0) hue-rotate(28deg)',
    washTop: 'rgba(15,181,166,0.16)', washBottom: 'rgba(255,150,40,0.26)',
    glow: 'rgba(25,227,214,0.5)', titleShadow: '#ff7a18',
  },
  gold: {
    label: 'Palm Gold',
    swatch: 'linear-gradient(135deg,#ffc93c,#ff7a18 60%,#5c2e00)',
    filter: 'saturate(1.35) contrast(1.06) brightness(1.06) sepia(0.34)',
    washTop: 'rgba(255,201,60,0.18)', washBottom: 'rgba(255,122,24,0.28)',
    glow: 'rgba(255,201,60,0.6)', titleShadow: '#ff7a18',
  },
  noir: {
    label: 'Noir',
    swatch: 'linear-gradient(135deg,#e8e8e8,#555 60%,#111)',
    filter: 'grayscale(1) contrast(1.28) brightness(1.06)',
    washTop: 'rgba(255,255,255,0.06)', washBottom: 'rgba(0,0,0,0.30)',
    glow: 'rgba(255,255,255,0.4)', titleShadow: '#000000',
  },
};

// Layouts return panel rects in normalized coordinates (0..1) with an optional tilt in degrees.
// The white gutters between panels are the poster's paper showing through.
export const LAYOUTS = {
  poster: {
    label: 'Poster Grid',
    panels: () => [
      { x: 0.00, y: 0.00, w: 0.52, h: 0.40 },
      { x: 0.52, y: 0.00, w: 0.48, h: 0.40 },
      { x: 0.00, y: 0.40, w: 0.34, h: 0.30 },
      { x: 0.34, y: 0.40, w: 0.33, h: 0.30 },
      { x: 0.67, y: 0.40, w: 0.33, h: 0.30 },
      { x: 0.00, y: 0.70, w: 0.58, h: 0.30 },
      { x: 0.58, y: 0.70, w: 0.42, h: 0.30 },
    ],
  },
  hero: {
    label: 'Hero + 3',
    panels: () => [
      { x: 0.00, y: 0.00, w: 0.62, h: 1.00 },
      { x: 0.62, y: 0.00, w: 0.38, h: 0.34 },
      { x: 0.62, y: 0.34, w: 0.38, h: 0.33 },
      { x: 0.62, y: 0.67, w: 0.38, h: 0.33 },
    ],
  },
  bleed: {
    label: 'Full Bleed',
    panels: () => [{ x: 0, y: 0, w: 1, h: 1 }],
  },
  tilt: {
    label: 'Tilted Snaps',
    panels: () => [
      { x: 0.03, y: 0.05, w: 0.44, h: 0.52, rot: -4 },
      { x: 0.52, y: 0.03, w: 0.44, h: 0.52, rot: 3 },
      { x: 0.10, y: 0.50, w: 0.40, h: 0.44, rot: 3 },
      { x: 0.55, y: 0.52, w: 0.38, h: 0.44, rot: -3 },
    ],
  },
};

let grainTile = null;

/** Builds a reusable 128x128 noise tile for the film-grain overlay. */
function getGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 128; tile.height = 128;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(128, 128);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 96 + Math.floor(Math.random() * 96);
    data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  grainTile = tile;
  return tile;
}

/** Draws one photo into a panel rect, cover-fit, with the panel's zoom and offsets. */
function drawPanelPhoto(ctx, img, rect, panel, grade, W, H) {
  const px = rect.x * W, py = rect.y * H, pw = rect.w * W, ph = rect.h * H;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  if (img) {
    const base = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
    const scale = base * (panel.zoom || 1);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = px + (pw - dw) / 2 + (panel.ox || 0) * pw;
    const dy = py + (ph - dh) / 2 + (panel.oy || 0) * ph;
    ctx.filter = grade.filter;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
  } else {
    const g = ctx.createLinearGradient(px, py, px + pw, py + ph);
    g.addColorStop(0, '#3a2d4d'); g.addColorStop(1, '#1d1626');
    ctx.fillStyle = g;
    ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `700 ${Math.max(14, pw * 0.045)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('+ add a photo', px + pw / 2, py + ph / 2);
  }
  ctx.restore();
}

/** Wraps the title into at most two lines that fit the given width at the given size. */
function wrapTitle(ctx, text, maxWidth, size) {
  ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth || !line) line = trial;
    else { lines.push(line); line = word; }
    if (lines.length === 2) break;
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

/** Draws the big skewed title, the neon script subtitle and the heat stars. */
function drawLettering(ctx, state, grade, W, H) {
  const title = (state.title || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  const margin = W * 0.06;
  const maxW = W - margin * 2;
  if (title) {
    let size = H * 0.115;
    let lines = wrapTitle(ctx, title, maxW, size);
    while (lines.join(' ').length > 0 && size > H * 0.03) {
      ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
      if (ctx.measureText(lines.join(' ')).width <= maxW * 1.9 && lines.length <= 2) break;
      size -= H * 0.004;
      lines = wrapTitle(ctx, title, maxW, size);
    }
    const lineH = size * 1.02;
    const blockH = lines.length * lineH;
    let y = H - H * 0.055 - blockH + size * 0.82;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const line of lines) {
      ctx.save();
      ctx.translate(W / 2, y);
      ctx.transform(1, 0, -0.10, 1, 0, 0);
      ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#160a2e';
      ctx.lineWidth = size * 0.16;
      ctx.shadowColor = grade.titleShadow;
      ctx.shadowBlur = size * 0.35;
      ctx.shadowOffsetY = size * 0.06;
      ctx.strokeText(line, 0, 0);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(line, 0, 0);
      ctx.restore();
      y += lineH;
    }
    ctx.restore();
    if (sub) {
      const subSize = Math.max(H * 0.028, 18);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `italic 700 ${subSize}px "Segoe Script", "Brush Script MT", cursive`;
      ctx.shadowColor = grade.glow;
      ctx.shadowBlur = subSize * 0.9;
      const grad = ctx.createLinearGradient(W / 2 - maxW / 2, 0, W / 2 + maxW / 2, 0);
      grad.addColorStop(0, '#ffd166'); grad.addColorStop(0.5, '#ff2e88'); grad.addColorStop(1, '#19e3d6');
      ctx.fillStyle = grad;
      ctx.fillText(sub, W / 2, H - H * 0.055 - blockH - subSize * 0.55);
      ctx.restore();
    }
  }
}

/** Draws the badge pill (top-left) and the heat-meter stars (top-right). */
function drawChrome(ctx, state, W, H) {
  const pad = Math.max(14, W * 0.02);
  const badge = (state.badge || '').trim();
  if (badge) {
    const fs = Math.max(13, W * 0.016);
    ctx.save();
    ctx.font = `800 ${fs}px system-ui, sans-serif`;
    const tw = ctx.measureText(badge).width;
    const bw = tw + fs * 1.6, bh = fs * 2.1;
    ctx.fillStyle = 'rgba(22,10,46,0.85)';
    ctx.strokeStyle = '#ffc93c';
    ctx.lineWidth = Math.max(2, W * 0.002);
    ctx.beginPath();
    ctx.roundRect(pad, pad, bw, bh, bh / 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffc93c';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(badge, pad + bw / 2, pad + bh / 2 + 1);
    ctx.restore();
  }
  const stars = Math.max(0, Math.min(5, state.heat || 0));
  const s = Math.max(16, W * 0.024);
  ctx.save();
  ctx.font = `${s}px system-ui, sans-serif`;
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  let sx = W - pad;
  for (let i = 5; i >= 1; i--) {
    ctx.fillStyle = i <= stars ? '#ffc93c' : 'rgba(255,255,255,0.35)';
    ctx.shadowColor = i <= stars ? '#ff7a18' : 'transparent';
    ctx.shadowBlur = i <= stars ? s * 0.5 : 0;
    ctx.fillText('★', sx, pad);
    sx -= s * 1.25;
  }
  ctx.restore();
}

/**
 * Draws the whole cover onto `canvas` from `state`:
 * state = { layout, grade, title, subtitle, badge, heat, grain, vignette,
 *           photos: [HTMLImageElement|null...], panels: [{photo, zoom, ox, oy}...] }
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = LAYOUTS[state.layout] || LAYOUTS.poster;
  const gutter = Math.max(3, Math.round(Math.min(W, H) * 0.008));

  // Paper: white gutters between the panels, like a printed poster.
  ctx.fillStyle = '#f7f1e6';
  ctx.fillRect(0, 0, W, H);

  const rects = layout.panels();
  rects.forEach((r, i) => {
    const panel = (state.panels && state.panels[i]) || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const img = state.photos && panel.photo != null ? state.photos[panel.photo] || null : null;
    const inset = {
      x: r.x + (r.x > 0 ? gutter / W : 0),
      y: r.y + (r.y > 0 ? gutter / H : 0),
      w: r.w - (r.x > 0 ? gutter / W : 0) - (r.x + r.w < 1 ? gutter / W : 0),
      h: r.h - (r.y > 0 ? gutter / H : 0) - (r.y + r.h < 1 ? gutter / H : 0),
    };
    ctx.save();
    if (r.rot) {
      ctx.translate((inset.x + inset.w / 2) * W, (inset.y + inset.h / 2) * H);
      ctx.rotate((r.rot * Math.PI) / 180);
      ctx.translate(-(inset.x + inset.w / 2) * W, -(inset.y + inset.h / 2) * H);
    }
    drawPanelPhoto(ctx, img, inset, panel, grade, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, gutter * 0.5);
    ctx.strokeRect(inset.x * W, inset.y * H, inset.w * W, inset.h * H);
    ctx.restore();
  });

  // Sunset / neon wash over the whole cover.
  const wash = ctx.createLinearGradient(0, 0, 0, H);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(0.55, 'rgba(0,0,0,0)');
  wash.addColorStop(1, grade.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  // Sun glow, top corner.
  const glow = ctx.createRadialGradient(W * 0.82, H * 0.06, 0, W * 0.82, H * 0.06, W * 0.55);
  glow.addColorStop(0, grade.glow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  drawLettering(ctx, state, grade, W, H);
  drawChrome(ctx, state, W, H);

  if (state.vignette) {
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(10,4,24,0.38)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }
  if (state.grain) {
    const tile = getGrainTile();
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}
