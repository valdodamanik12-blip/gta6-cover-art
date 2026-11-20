// Cover renderer: draws one GTA-style multi-panel cover onto a 2D canvas.
// Everything is drawn from the state and the caller's photo map — no network.

import { LAYOUTS, GRADES, SIZES } from './state.js';

// Seeded grain so a cover renders identically every time it is drawn.
function makeGrainTile() {
  const tile = document.createElement('canvas');
  tile.width = 128;
  tile.height = 128;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(128, 128);
  let seed = 20261120;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  return tile;
}

let grainTile = null;
function grainPattern(ctx) {
  if (!grainTile) grainTile = makeGrainTile();
  return ctx.createPattern(grainTile, 'repeat');
}

// Draw one photo into a panel rect with cover-fit, zoom and pan.
function drawPhotoIntoPanel(ctx, img, rect, panel, W, H, grade) {
  const px = rect.x * W;
  const py = rect.y * H;
  const pw = rect.w * W;
  const ph = rect.h * H;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  if (rect.rot) {
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.rotate((rect.rot * Math.PI) / 180);
    ctx.translate(-(px + pw / 2), -(py + ph / 2));
  }
  if (img) {
    const scale = Math.max(pw / img.naturalWidth, ph / img.naturalHeight) * panel.zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = px + (pw - dw) / 2 + panel.ox * pw;
    const dy = py + (ph - dh) / 2 + panel.oy * ph;
    ctx.filter = grade.filter;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
  } else {
    ctx.fillStyle = '#3a1c55';
    ctx.fillRect(px, py, pw, ph);
  }
  // Grade: a diagonal warm wash, then a cool shadow, both clipped to the panel.
  const wash = ctx.createLinearGradient(px, py, px + pw, py + ph);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = grade.washAlpha;
  ctx.fillStyle = wash;
  ctx.fillRect(px, py, pw, ph);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = grade.shadowAlpha;
  ctx.fillStyle = grade.shadow;
  ctx.fillRect(px, py, pw, ph);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

// Bold genre lettering: huge condensed capitals with a hard outline and a
// soft shadow, plus a loose neon-script subtitle underneath.
function drawCaption(ctx, state, W, H) {
  const grade = GRADES[state.grade];
  const margin = W * 0.045;
  const titleSize = Math.round(W * 0.115);
  const subSize = Math.round(W * 0.042);
  let titleY;
  if (state.titlePos === 'top') titleY = H * 0.06 + titleSize;
  else if (state.titlePos === 'center') titleY = H * 0.5 + titleSize / 2;
  else titleY = H * 0.94 - subSize * 1.6;

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = W * 0.012;
  ctx.shadowOffsetY = W * 0.006;

  const font = `900 ${titleSize}px "Arial Black", Impact, "Franklin Gothic Heavy", sans-serif`;
  ctx.font = font;
  const title = (state.title || 'VICE COAST').toUpperCase();
  // Letter-spacing by hand: measure each glyph so the outline hugs the text.
  const gap = titleSize * 0.06;
  const widths = [...title].map((ch) => ctx.measureText(ch).width + gap);
  const totalW = widths.reduce((a, b) => a + b, 0) - gap;
  const startX = (W - totalW) / 2;
  let x = startX;
  const fill =
    state.titleColor === 'white'
      ? '#ffffff'
      : state.titleColor === 'pink'
        ? '#ff2e88'
        : state.titleColor === 'gold'
          ? '#ffc93c'
          : (() => {
              const g = ctx.createLinearGradient(0, titleY - titleSize, 0, titleY);
              g.addColorStop(0, '#ffc93c');
              g.addColorStop(0.55, '#ff7a1a');
              g.addColorStop(1, '#ff2e88');
              return g;
            })();
  [...title].forEach((ch, i) => {
    ctx.lineWidth = Math.max(4, titleSize * 0.09);
    ctx.strokeStyle = '#14081f';
    ctx.lineJoin = 'round';
    ctx.strokeText(ch, x, titleY);
    ctx.fillStyle = fill;
    ctx.fillText(ch, x, titleY);
    x += widths[i];
  });

  if (state.subtitle) {
    ctx.font = `italic 600 ${subSize}px "Brush Script MT", "Segoe Script", cursive`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255,46,136,0.9)';
    ctx.shadowBlur = W * 0.01;
    const subY = state.titlePos === 'top' ? titleY + subSize * 1.5 : titleY + subSize * 1.5;
    ctx.fillText(state.subtitle, W / 2, Math.min(subY, H - H * 0.02));
  }
  ctx.restore();
  return { titleY };
}

function drawBadge(ctx, W, H) {
  const s = Math.round(W * 0.016);
  ctx.save();
  ctx.font = `700 ${s}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('★ ★ ★ ★ ★', W - W * 0.03, H * 0.045);
  ctx.restore();
}

export function renderCover(canvas, state, photos) {
  const size = SIZES[state.size];
  const W = size.w;
  const H = size.h;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade];
  const layout = LAYOUTS[state.layout];

  // Deep sunset backdrop behind the panels.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#2b0a4d');
  bg.addColorStop(0.5, '#7b1e5e');
  bg.addColorStop(1, '#ff7a1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Sun disc glow behind the panels for the Vice City sky.
  const sun = ctx.createRadialGradient(W * 0.72, H * 0.3, 10, W * 0.72, H * 0.3, W * 0.45);
  sun.addColorStop(0, 'rgba(255,201,60,0.55)');
  sun.addColorStop(1, 'rgba(255,201,60,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);

  layout.panels.forEach((rect, i) => {
    const panel = state.panels[i] || { photo: 'sample-boulevard', zoom: 1.15, ox: 0, oy: 0 };
    const img = photos.get(panel.photo) || null;
    drawPhotoIntoPanel(ctx, img, rect, panel, W, H, grade);
    if (state.frame) {
      ctx.save();
      if (rect.rot) {
        ctx.translate((rect.x + rect.w / 2) * W, (rect.y + rect.h / 2) * H);
        ctx.rotate((rect.rot * Math.PI) / 180);
        ctx.translate(-(rect.x + rect.w / 2) * W, -(rect.y + rect.h / 2) * H);
      }
      ctx.lineWidth = Math.max(3, W * 0.004);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(rect.x * W, rect.y * H, rect.w * W, rect.h * H);
      ctx.restore();
    }
  });

  // Outer white frame, poster style.
  ctx.lineWidth = Math.max(6, W * 0.008);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(W * 0.008, H * 0.008, W * 0.984, H * 0.984);

  if (state.vignette) {
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(10,2,18,0.5)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = grainPattern(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  drawCaption(ctx, state, W, H);
  drawBadge(ctx, W, H);
  return canvas;
}

// Which panel (if any) sits at normalised point (nx, ny) of the cover.
export function panelAt(state, nx, ny) {
  const panels = LAYOUTS[state.layout].panels;
  for (let i = panels.length - 1; i >= 0; i--) {
    const r = panels[i];
    if (nx >= r.x && nx <= r.x + r.w && ny >= r.y && ny <= r.y + r.h) return i;
  }
  return -1;
}
