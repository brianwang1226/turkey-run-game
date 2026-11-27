// Entry point. One fixed-step loop (60 updates a second) drives the world;
// the page, the keys and the sound stay out of the world itself. Best score
// is kept in localStorage; a staged scene (`?shot=start|play|kitchen|end`)
// plays the real game forward with an autopilot, for repeatable screenshots.
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRandom } from './random.js';
import { BEST_KEY, FIELD, STEP } from './config.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createWorld, EVENT_CORN, EVENT_ESCAPED, EVENT_HIT, EVENT_JUMP, EVENT_OVER } from './world.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const audio = createAudio();
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
// A staged scene takes its seed from the URL, so the same scene is the same
// every time; a live run is seeded from the clock, so no two runs match.
const seed = Number(params.get('seed') ?? Date.now()) || Date.now();
const world = createWorld(createRandom(seed));

let screen = SCREEN_TITLE;
let best = 0;
try {
  best = Number(localStorage.getItem(BEST_KEY) || '0') || 0;
} catch {
  best = 0;
}
let saved = false;

function saveBest() {
  if (saved) return;
  saved = true;
  const score = Math.floor(world.state.score);
  if (score <= best) return;
  best = score;
  try {
    localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // Best score is nice to have; the game must not break without it.
  }
}

function startRun() {
  world.reset();
  screen = SCREEN_PLAY;
}

function announce(text) {
  statusLine.textContent = text;
}

function play(events) {
  if (events & EVENT_JUMP) audio.jump();
  if (events & EVENT_HIT) audio.hit();
  if (events & EVENT_CORN) audio.pickup();
  if (events & EVENT_OVER) {
    screen = SCREEN_OVER;
    saveBest();
    if (events & EVENT_ESCAPED) {
      audio.win();
      announce(`Pardoned! Score ${Math.floor(world.state.score)}. Best ${best}.`);
    } else {
      audio.caught();
      announce(`Caught after ${Math.floor(world.state.distanceM)} metres. Score ${Math.floor(world.state.score)}. Best ${best}.`);
    }
  }
}

function frame(now, previous) {
  const delta = Math.min(0.1, (now - previous) / 1000);
  let steps = 0;
  for (let elapsed = 0; elapsed < delta && steps < 8; elapsed += STEP) {
    const actions = input.takeActions();
    if (actions & ACTION_PAUSE && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED)) {
      screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
    }
    if (screen === SCREEN_TITLE && actions & ACTION_CONFIRM) startRun();
    else if (screen === SCREEN_OVER && actions & ACTION_CONFIRM) startRun();
    else if (screen === SCREEN_PLAY) {
      const events = world.step(STEP, { jump: input.jumpHeld(), slide: input.slideHeld() }, false);
      play(events);
    } else if (screen === SCREEN_TITLE) {
      world.step(STEP, { jump: false, slide: false }, true);
    }
    steps += 1;
  }
  renderer.draw(world.state, screen, best);
  if (screen === SCREEN_PLAY) {
    const { distanceM, score, lives } = world.state;
    announce(`Score ${Math.floor(score)}. ${Math.floor(distanceM)} metres. ${lives} ${lives === 1 ? 'life' : 'lives'} left.`);
  } else if (screen === SCREEN_PAUSED) {
    announce('Paused.');
  }
  requestAnimationFrame((next) => frame(next, now));
}

function boot() {
  if (shot) {
    screen = stageShot(shot, world);
    saveBest();
    renderer.draw(world.state, screen, best);
    window.__shotReady = true;
    announce(`Scene ${shot}.`);
    return;
  }
  renderer.resize();
  window.addEventListener('resize', renderer.resize);
  canvas.focus();
  announce('Pardon Run. Press Space or click to run.');
  requestAnimationFrame((now) => frame(now, now));
}

boot();
export { FIELD };
