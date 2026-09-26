// Shared runtime state (kept tiny on purpose).
export const state = {
  save: null,     // current save object (see systems/save.js)
  notice: null,   // one-off message to show after boot (migration, recovered save)
  scene: null,    // active WorldScene
  game: null,
  dpr: Math.min(window.devicePixelRatio || 1, 2),
};
