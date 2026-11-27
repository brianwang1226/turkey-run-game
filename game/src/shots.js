// Deterministic staged scenes for the screenshots. An autopilot plays the
// real rules forward, so every frame is a frame the game itself produced:
// the same seed always gives the same scene, and the same scene is what a
// player sees. `end` uses a short look-ahead on purpose, so the turkey gets
// caught and the caught screen shows.
import { ESCAPE_M, FIELD, PX_PER_M, STEP, TURKEY } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/**
 * The autopilot's one rule: the next obstacle ahead. A jump starts about
 * 0.35 s before the obstacle arrives — early enough to clear it, late
 * enough to still be in the air when it passes under. Sliding has no
 * timing cost (duck and stay down), so its horizon is generous. A tiny
 * horizon (0.08 s) is too late, which is how the `end` scene gets caught.
 */
function autopilotStep(world, jumpHorizon, slideHorizon) {
  const { state } = world;
  let jump = false;
  let slide = false;
  let nearest = null;
  let nearestGap = Infinity;
  for (const o of state.obstacles) {
    if (!o.active || o.x + o.width < TURKEY.x) continue;
    const gap = o.x - (TURKEY.x + TURKEY.width);
    if (gap < nearestGap) {
      nearestGap = gap;
      nearest = o;
    }
  }
  if (nearest) {
    const reaction = nearestGap / world.speed();
    if (nearest.jump) jump = reaction < jumpHorizon && state.turkey.onGround;
    else slide = reaction < slideHorizon && state.turkey.onGround;
  }
  return world.step(STEP, { jump, slide }, false);
}

export function stageShot(name, world) {
  world.reset();
  if (name === 'start') {
    // A couple of seconds of harmless scrolling behind the title.
    for (let i = 0; i < 120; i += 1) world.step(STEP, { jump: false, slide: false }, true);
    return SCREEN_TITLE;
  }
  if (name === 'play') {
    for (let i = 0; i < 60 * 24; i += 1) {
      const events = autopilotStep(world, 0.35, 0.5);
      if (events !== 0 && world.state.over) break;
    }
    return SCREEN_PLAY;
  }
  if (name === 'kitchen') {
    // Drop the turkey into stage 3, then play it for real.
    world.state.distancePx = 2000 * PX_PER_M;
    world.state.distanceM = 2000;
    for (const o of world.state.obstacles) o.active = false;
    for (const p of world.state.pickups) p.active = false;
    world.state.obstacleTimer = 0.5;
    for (let i = 0; i < 60 * 8; i += 1) {
      const events = autopilotStep(world, 0.35, 0.5);
      if (events !== 0 && world.state.over) break;
    }
    return SCREEN_PLAY;
  }
  if (name === 'end') {
    // Sloppy play until the farmer catches the turkey; if it somehow keeps
    // going, stop jumping entirely — a hit is then only seconds away.
    let steps = 0;
    while (!world.state.over && steps < 60 * 45) {
      autopilotStep(world, 0.08, 0.08);
      steps += 1;
    }
    while (!world.state.over && steps < 60 * 90) {
      world.step(STEP, { jump: false, slide: false }, false);
      steps += 1;
    }
    return SCREEN_OVER;
  }
  throw new Error(`unknown shot ${name}`);
}

export const SHOT_NAMES = ['start', 'play', 'kitchen', 'end'];
export { ESCAPE_M, FIELD };
