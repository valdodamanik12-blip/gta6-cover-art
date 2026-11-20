// Fixed scenes for screenshots: ?shot=cover draws the cover alone, full frame, at the
// chosen export size; ?shot=editor shows the editor with photos loaded. The query picks
// the layout, grade, size, photos and words. window.__shotReady is set once painted.
export async function runShot(shot, query, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');

  const photoA = query.get('photo') || 'boulevard';
  const photoB = query.get('photo2') || 'pier';
  await api.loadSample(`samples/${photoA}.jpg`);
  await api.loadSample(`samples/${photoB}.jpg`);

  api.setState({
    layout: query.get('layout') || 'poster',
    grade: query.get('grade') || 'sunset',
    size: query.get('size') || 'square',
    title: query.get('caption') || 'BOULEVARD QUEEN',
    subtitle: query.get('subtitle') || 'one night in palm coast',
    badge: query.get('badge') || 'PALM COAST · EST. 2026',
    heat: Number(query.get('heat') || 4),
    grain: query.get('grain') !== '0',
    vignette: query.get('vignette') !== '0',
  });
  api.render();

  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
