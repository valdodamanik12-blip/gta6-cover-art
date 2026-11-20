// Cover state: the serialisable part of a cover (everything except the loaded images),
// plus a small undo/redo history. Photos live outside the state as HTMLImageElements;
// panels only store the index of the photo they show.

import { LAYOUTS } from './cover.js';

/** A fresh cover state: poster grid, sunset grade, two sample slots. */
export function defaultState() {
  return {
    layout: 'poster',
    grade: 'sunset',
    size: 'square',
    title: 'BOULEVARD QUEEN',
    subtitle: 'one night in palm coast',
    badge: 'PALM COAST · EST. 2026',
    heat: 4,
    grain: true,
    vignette: true,
    panels: panelsForLayout('poster'),
  };
}

/** One panel slot per layout panel, photos alternating between the first two. */
export function panelsForLayout(layoutKey) {
  const count = (LAYOUTS[layoutKey] || LAYOUTS.poster).panels().length;
  return Array.from({ length: count }, (_, i) => ({
    photo: i % 2 === 0 ? 0 : 1,
    zoom: 1.05,
    ox: 0,
    oy: 0,
  }));
}

/** Deep-clones a state object (plain JSON data only). */
export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

/** Undo/redo stack over state snapshots. */
export class CoverHistory {
  constructor(initial) {
    this.past = [];
    this.future = [];
    this.current = cloneState(initial);
  }

  /** Records the state after a change, clearing the redo stack. */
  push(next) {
    this.past.push(this.current);
    if (this.past.length > 60) this.past.shift();
    this.current = cloneState(next);
    this.future = [];
  }

  undo() {
    if (!this.past.length) return null;
    this.future.push(this.current);
    this.current = this.past.pop();
    return cloneState(this.current);
  }

  redo() {
    if (!this.future.length) return null;
    this.past.push(this.current);
    this.current = this.future.pop();
    return cloneState(this.current);
  }

  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
}
