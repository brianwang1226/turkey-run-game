// The game's rules and state, with no drawing and no browser in it: the
// turkey runs right on its own, the world scrolls left under it, the farmer
// trails behind, and obstacles and pickups scroll in. step() advances one
// fixed step and returns what happened as bit flags, so the caller can react
// without the world knowing about screens or sound. Nothing here allocates
// after createWorld returns.

import {
  ESCAPE_M,
  FARMER,
  FIELD,
  LIVES,
  OBSTACLE,
  PICKUP,
  PICKUP_INTERVAL,
  POOL_SIZE,
  PX_PER_M,
  SPAWN,
  SPEED,
  STAGES,
  TURKEY,
} from './config.js';

export const EVENT_HIT = 1;
export const EVENT_CORN = 2;
export const EVENT_OVER = 4;
export const EVENT_ESCAPED = 8;
export const EVENT_JUMP = 16;

const OBSTACLE_DEFS = [OBSTACLE.fence, OBSTACLE.hay, OBSTACLE.oven, OBSTACLE.knife, OBSTACLE.hook];

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** The turkey's collision box, shrunk a little on every side: near misses
 * should feel fair, not cheap. */
function turkeyBox(turkey) {
  const h = turkey.sliding ? TURKEY.slideHeight : TURKEY.height;
  return {
    x: turkey.x + 8,
    // The box rises with the jump (turkey.y) and sits lower while sliding.
    y: turkey.y + (TURKEY.height - h) + 6,
    width: TURKEY.width - 16,
    height: h - 6,
  };
}

export function createWorld(random) {
  const turkey = {
    x: TURKEY.x,
    y: FIELD.groundY - TURKEY.height,
    vy: 0,
    sliding: false,
    onGround: true,
    invulnerable: 0,
  };
  const obstacles = [];
  const pickups = [];
  for (let i = 0; i < POOL_SIZE; i += 1) {
    obstacles.push({ active: false, kind: 'fence', x: 0, y: 0, width: 0, height: 0, jump: true, points: 0, passed: false });
    pickups.push({ active: false, kind: 'corn', x: 0, y: 0, width: 0, height: 0, points: 0 });
  }
  const state = {
    turkey,
    obstacles,
    pickups,
    score: 0,
    lives: LIVES,
    stage: 1,
    distanceM: 0,
    elapsed: 0,
    escaped: false,
    over: false,
    obstacleTimer: 0,
    pickupTimer: 0,
    distancePx: 0,
  };

  function reset() {
    turkey.y = FIELD.groundY - TURKEY.height;
    turkey.vy = 0;
    turkey.sliding = false;
    turkey.onGround = true;
    turkey.invulnerable = 0;
    for (const o of obstacles) o.active = false;
    for (const p of pickups) p.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.stage = 1;
    state.distanceM = 0;
    state.distancePx = 0;
    state.elapsed = 0;
    state.escaped = false;
    state.over = false;
    state.obstacleTimer = SPAWN.interval;
    state.pickupTimer = PICKUP_INTERVAL;
  }

  function speed() {
    return SPEED.base + SPEED.perStage * (state.stage - 1);
  }

  /** The farmer's x: 90 px behind the turkey, plus 55 px per life left. */
  function farmerX() {
    return TURKEY.x - FARMER.baseGap - state.lives * FARMER.gapPerLife - FARMER.width;
  }

  function freeObstacle() {
    for (const o of obstacles) if (!o.active) return o;
    return null;
  }

  function freePickup() {
    for (const p of pickups) if (!p.active) return p;
    return null;
  }

  function lastObstacleX() {
    let x = -Infinity;
    for (const o of obstacles) if (o.active) x = Math.max(x, o.x + o.width);
    return x;
  }

  function spawnObstacle() {
    if (lastObstacleX() > FIELD.width - 300) return;
    const item = freeObstacle();
    if (item === null) return;
    // The oven only shows up in the kitchen (stage 3); the rest anywhere.
    const defs = state.stage >= 3 ? OBSTACLE_DEFS : OBSTACLE_DEFS.filter((d) => d.kind !== 'oven');
    const def = defs[Math.floor(random() * defs.length)];
    item.active = true;
    item.kind = def.kind;
    item.jump = def.jump;
    item.points = def.points;
    item.width = def.w;
    item.height = def.h;
    item.passed = false;
    item.x = FIELD.width + 40;
    // Jump obstacles stand on the ground; slide ones hang low, clearing a
    // sliding turkey (32 px tall) by 2 px and hitting a standing one (64 px).
    item.y = def.jump ? FIELD.groundY - def.h : FIELD.groundY - 58;
    if (!def.jump) item.height = 24;
  }

  function spawnPickup() {
    const item = freePickup();
    if (item === null) return;
    const roll = random();
    let kind = 'corn';
    if (roll > 0.9 && state.lives < LIVES) kind = 'gravy';
    else if (roll > 0.7) kind = 'feather';
    const def = PICKUP[kind];
    item.active = true;
    item.kind = kind;
    item.points = def.points;
    item.width = def.size;
    item.height = def.size;
    item.x = FIELD.width + 40;
    // Corn sits on the ground; feathers float at jump height.
    item.y = kind === 'feather' ? FIELD.groundY - 170 : FIELD.groundY - def.size;
  }

  function spawnInterval() {
    return Math.max(SPAWN.min, SPAWN.interval - SPAWN.perStage * (state.stage - 1));
  }

  /**
   * One fixed step. `input` is { jump, slide } held states. With `harmless`
   * set (the title screen's backdrop) things scroll but nothing touches the
   * turkey and nothing scores.
   */
  function step(dt, input, harmless) {
    let events = 0;
    state.elapsed += dt;
    const v = speed();
    state.distancePx += v * dt;
    state.distanceM = state.distancePx / PX_PER_M;
    state.stage = state.distanceM < STAGES[0].untilM ? 1 : state.distanceM < STAGES[1].untilM ? 2 : 3;
    if (!harmless) state.score += (v * dt) / PX_PER_M;

    if (!harmless && state.distanceM >= ESCAPE_M) {
      state.escaped = true;
      state.over = true;
      return events | EVENT_ESCAPED | EVENT_OVER;
    }

    // --- the turkey ---
    if (input.jump && turkey.onGround) {
      turkey.vy = -TURKEY.jumpVelocity;
      turkey.onGround = false;
      turkey.sliding = false;
      events |= EVENT_JUMP;
    }
    turkey.sliding = Boolean(input.slide && turkey.onGround);
    if (!turkey.onGround) {
      turkey.vy += TURKEY.gravity * dt;
      turkey.y += turkey.vy * dt;
      if (turkey.y >= FIELD.groundY - TURKEY.height) {
        turkey.y = FIELD.groundY - TURKEY.height;
        turkey.vy = 0;
        turkey.onGround = true;
      }
    }
    if (turkey.invulnerable > 0) turkey.invulnerable = Math.max(0, turkey.invulnerable - dt);

    // --- spawning ---
    state.obstacleTimer -= dt;
    if (state.obstacleTimer <= 0) {
      spawnObstacle();
      state.obstacleTimer += spawnInterval() + random() * SPAWN.jitter;
    }
    state.pickupTimer -= dt;
    if (state.pickupTimer <= 0) {
      spawnPickup();
      state.pickupTimer += PICKUP_INTERVAL + random();
    }

    // --- obstacles scroll, score and collide ---
    const box = turkeyBox(turkey);
    for (const o of obstacles) {
      if (!o.active) continue;
      o.x -= v * dt;
      if (o.x + o.width < 0) {
        o.active = false;
        continue;
      }
      if (!o.passed && o.x + o.width < TURKEY.x) {
        o.passed = true;
        if (!harmless) state.score += o.points;
      }
      if (harmless || turkey.invulnerable > 0) continue;
      if (overlaps(box, o)) {
        o.active = false;
        state.lives -= 1;
        turkey.invulnerable = TURKEY.invulnerable;
        events |= EVENT_HIT;
        if (state.lives === 0) {
          state.over = true;
          return events | EVENT_OVER;
        }
      }
    }

    // --- pickups scroll and collect ---
    for (const p of pickups) {
      if (!p.active) continue;
      p.x -= v * dt;
      if (p.x + p.width < 0) {
        p.active = false;
        continue;
      }
      if (harmless || !overlaps(box, p)) continue;
      p.active = false;
      state.score += p.points;
      if (p.kind === 'gravy' && state.lives < LIVES) state.lives += 1;
      events |= EVENT_CORN;
    }
    return events;
  }

  reset();
  return { state, reset, step, speed, farmerX };
}
