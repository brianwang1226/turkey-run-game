// Every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule
// below depends on the screen size. The turkey runs right on its own; the
// world scrolls left under it.

export const FIELD = { width: 1280, height: 720, groundY: 620 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** 25 scrolled pixels are one metre of escape. */
export const PX_PER_M = 25;
/** Reach this distance and the turkey is pardoned: the run is won. */
export const ESCAPE_M = 2400;

export const TURKEY = {
  x: 280,
  width: 62,
  height: 64,
  slideHeight: 32,
  jumpVelocity: 1300,
  gravity: 3600,
  invulnerable: 1.5,
};

export const LIVES = 3;

/** The farmer trails the turkey by 50 px plus 44 px per life left: at three
 * lives he stands at x = 40, fully on screen; each hit brings him closer. */
export const FARMER = { baseGap: 50, gapPerLife: 44, width: 58, height: 96 };

/** px/s at stage 1, and how much faster each later stage runs. */
export const SPEED = { base: 440, perStage: 40 };

/** Obstacle kinds. `jump` ones are cleared by jumping over; `slide` ones by
 * sliding under. `h` is the height above the ground (jump) or below the
 * turkey's head (slide). */
export const OBSTACLE = {
  fence: { kind: 'fence', jump: true, w: 34, h: 72, points: 2 },
  hay: { kind: 'hay', jump: true, w: 56, h: 56, points: 2 },
  oven: { kind: 'oven', jump: true, w: 60, h: 90, points: 5 },
  knife: { kind: 'knife', jump: false, w: 30, h: 78, points: 3 },
  hook: { kind: 'hook', jump: false, w: 44, h: 66, points: 3 },
};

export const PICKUP = {
  corn: { points: 10, size: 26 },
  feather: { points: 25, size: 26 },
  gravy: { points: 15, size: 30 },
};

/** Seconds between obstacle spawns at stage 1, shrinking per stage. */
export const SPAWN = { interval: 1.05, perStage: 0.1, min: 0.55, jitter: 0.45 };
export const PICKUP_INTERVAL = 2.6;

/** The three stages: farmyard, orchard, kitchen. */
export const STAGES = [
  { name: 'Farmyard', untilM: 800, sky: ['#fde68a', '#f59e0b'], ground: '#92400e' },
  { name: 'Orchard', untilM: 1600, sky: ['#fca5a5', '#ea580c'], ground: '#7c2d12' },
  { name: 'Kitchen', untilM: ESCAPE_M, sky: ['#fcd34d', '#b45309'], ground: '#57534e' },
];

/** How many obstacles / pickups can exist at once; pools are allocated once. */
export const POOL_SIZE = 48;

export const PALETTE = {
  backdrop: '#1c1008',
  panel: '#2b1a0e',
  panelEdge: '#b45309',
  text: '#fff7ed',
  muted: '#d6a97c',
  gold: '#fbbf24',
  red: '#dc2626',
  green: '#16a34a',
  turkeyBody: '#8a5230',
  turkeyDark: '#6b3d20',
  tail: ['#a0522d', '#d2691e', '#e8a33c'],
  head: '#f1f5f9',
  wattle: '#e5534b',
  beak: '#f59e0b',
  farmerShirt: '#2563eb',
  farmerOveralls: '#1e40af',
  farmerSkin: '#f2c89b',
  farmerHat: '#78350f',
  oven: '#44403c',
  ovenFire: '#f97316',
  knifeBlade: '#e2e8f0',
  knifeHandle: '#7a4a26',
  corn: '#f2c94c',
  feather: '#fde68a',
  gravy: '#f8fafc',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'pardon-run.best';
