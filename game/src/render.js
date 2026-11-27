// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred, the margin
// filled with the backdrop colour. All art is drawn with canvas shapes —
// no image files, no network. Text that holds a number is rebuilt only when
// the number changes, so a frame allocates nothing.
import { ESCAPE_M, FARMER, FIELD, FONT, LIVES, PALETTE, STAGES, TURKEY } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 660, top: 120, line: 36, bottom: 76 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const distLabel = cachedLabel('');
  const bestLabel = cachedLabel('Best ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.fillText(value, x, y);
  }

  function roundRect(x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  // --- scenery ---
  function drawSky(stage, scroll) {
    const grad = context.createLinearGradient(0, 0, 0, FIELD.groundY);
    grad.addColorStop(0, stage.sky[0]);
    grad.addColorStop(1, stage.sky[1]);
    context.fillStyle = grad;
    context.fillRect(0, 0, FIELD.width, FIELD.groundY);
    // Sun.
    context.fillStyle = '#fef3c7';
    context.beginPath();
    context.arc(1120, 110, 46, 0, Math.PI * 2);
    context.fill();
    // Clouds drift with distance, slowly.
    context.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 4; i += 1) {
      const cx = (((i * 340 - 40 - scroll * 0.08) % 1400) + 1400) % 1400;
      context.beginPath();
      context.ellipse(cx, 80 + (i % 2) * 50, 70, 22, 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawBackdrop(stage, scroll) {
    context.fillStyle = stage.ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    // Ground line and scrolling tufts.
    context.fillStyle = 'rgba(0,0,0,0.25)';
    context.fillRect(0, FIELD.groundY, FIELD.width, 6);
    context.fillStyle = 'rgba(255,255,255,0.18)';
    for (let x = -(scroll % 90); x < FIELD.width; x += 90) {
      context.fillRect(x, FIELD.groundY + 26, 34, 4);
    }
    if (stage.name === 'Farmyard') {
      // Barn and fence, scrolling slowly.
      const bx = 900 - ((scroll * 0.3) % 1600);
      context.fillStyle = '#7f1d1d';
      context.fillRect(bx, 430, 260, 190);
      context.fillStyle = '#991b1b';
      context.beginPath();
      context.moveTo(bx - 14, 430);
      context.lineTo(bx + 130, 340);
      context.lineTo(bx + 274, 430);
      context.closePath();
      context.fill();
      context.fillStyle = '#451a03';
      context.fillRect(bx + 100, 520, 60, 100);
    } else if (stage.name === 'Orchard') {
      for (let i = 0; i < 5; i += 1) {
        const tx = ((i * 300 - scroll * 0.5) % 1500 + 1500) % 1500 - 100;
        context.fillStyle = '#78350f';
        context.fillRect(tx + 18, 480, 16, 140);
        context.fillStyle = '#166534';
        context.beginPath();
        context.arc(tx + 26, 450, 62, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#ea580c';
        context.beginPath();
        context.arc(tx, 470, 10, 0, Math.PI * 2);
        context.arc(tx + 52, 440, 10, 0, Math.PI * 2);
        context.fill();
      }
    } else {
      // Kitchen: tiled wall and a window, scrolling slowly.
      context.fillStyle = '#e7e5e4';
      for (let x = -(scroll % 80); x < FIELD.width; x += 80) {
        context.fillRect(x, 300, 2, 320);
      }
      context.fillRect(0, 380, FIELD.width, 2);
      context.fillStyle = '#bae6fd';
      context.fillRect(180, 180, 200, 130);
      context.fillStyle = '#78350f';
      context.fillRect(170, 170, 220, 12);
      context.fillRect(170, 310, 220, 12);
      context.fillRect(170, 170, 12, 152);
      context.fillRect(378, 170, 12, 152);
    }
  }

  // --- actors ---
  function drawTurkey(player, elapsed) {
    const cx = player.x + TURKEY.width / 2;
    const h = player.sliding ? TURKEY.slideHeight : TURKEY.height;
    const base = FIELD.groundY;
    const run = Math.sin(elapsed * 14) * 6;
    // Tail fan.
    for (let i = 0; i < 3; i += 1) {
      context.fillStyle = PALETTE.tail[i];
      context.beginPath();
      context.arc(cx - 16, base - h + 18, 30 - i * 6, Math.PI * 0.9, Math.PI * 2.1);
      context.fill();
    }
    // Body.
    context.fillStyle = PALETTE.turkeyBody;
    context.beginPath();
    context.ellipse(cx + 4, base - h / 2 - 4, 30, h / 2, 0, 0, Math.PI * 2);
    context.fill();
    // Wing.
    context.fillStyle = PALETTE.turkeyDark;
    context.beginPath();
    context.ellipse(cx, base - h / 2, 14, 10, -0.4, 0, Math.PI * 2);
    context.fill();
    // Head, beak, wattle: the head rides at the body's top, so it ducks
    // with the body while sliding instead of poking through the knife.
    const headY = base - h + 10;
    context.fillStyle = PALETTE.head;
    context.beginPath();
    context.arc(cx + 26, headY, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.beak;
    context.beginPath();
    context.moveTo(cx + 36, headY - 2);
    context.lineTo(cx + 50, headY + 2);
    context.lineTo(cx + 36, headY + 6);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.wattle;
    context.beginPath();
    context.arc(cx + 30, headY + 12, 5, 0, Math.PI * 2);
    context.fill();
    // Legs: running, or tucked mid-jump, or folded while sliding.
    context.strokeStyle = PALETTE.beak;
    context.lineWidth = 4;
    context.beginPath();
    if (player.sliding) {
      context.moveTo(cx - 6, base - 6);
      context.lineTo(cx + 14, base - 2);
      context.moveTo(cx + 8, base - 6);
      context.lineTo(cx + 26, base - 2);
    } else if (!player.onGround) {
      context.moveTo(cx - 6, base - 10);
      context.lineTo(cx - 2, base - 2);
      context.moveTo(cx + 8, base - 10);
      context.lineTo(cx + 14, base - 2);
    } else {
      context.moveTo(cx - 8, base - 12);
      context.lineTo(cx - 8 + run, base - 2);
      context.moveTo(cx + 8, base - 12);
      context.lineTo(cx + 8 - run, base - 2);
    }
    context.stroke();
  }

  function drawFarmer(x, elapsed) {
    const bob = Math.sin(elapsed * 12) * 3;
    const base = FIELD.groundY;
    // Legs.
    context.strokeStyle = PALETTE.farmerOveralls;
    context.lineWidth = 7;
    context.beginPath();
    context.moveTo(x + 18, base - 44 + bob);
    context.lineTo(x + 12, base);
    context.moveTo(x + 36, base - 44 - bob);
    context.lineTo(x + 42, base);
    context.stroke();
    // Body and overalls.
    context.fillStyle = PALETTE.farmerShirt;
    context.fillRect(x + 8, base - 78, 42, 38);
    context.fillStyle = PALETTE.farmerOveralls;
    context.fillRect(x + 8, base - 58, 42, 20);
    // Head and hat.
    context.fillStyle = PALETTE.farmerSkin;
    context.beginPath();
    context.arc(x + 29, base - 88, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.farmerHat;
    context.fillRect(x + 12, base - 104, 34, 8);
    context.fillRect(x + 18, base - 116, 22, 12);
    // Pitchfork, held high.
    context.strokeStyle = '#78350f';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(x + 50, base - 70);
    context.lineTo(x + 58, base - 128);
    context.stroke();
    context.strokeStyle = '#d6d3d1';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(x + 52, base - 128);
    context.lineTo(x + 52, base - 142);
    context.moveTo(x + 58, base - 128);
    context.lineTo(x + 58, base - 144);
    context.moveTo(x + 64, base - 128);
    context.lineTo(x + 64, base - 142);
    context.stroke();
  }

  function drawObstacle(o) {
    if (o.kind === 'fence') {
      context.fillStyle = '#92400e';
      context.fillRect(o.x, o.y + 8, o.width, 8);
      context.fillRect(o.x, o.y + 34, o.width, 8);
      context.fillRect(o.x + 4, o.y, 8, o.height);
      context.fillRect(o.x + o.width - 12, o.y, 8, o.height);
    } else if (o.kind === 'hay') {
      context.fillStyle = '#eab308';
      roundRect(o.x, o.y, o.width, o.height, 14);
      context.fill();
      context.strokeStyle = '#a16207';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(o.x + 8, o.y + 18);
      context.lineTo(o.x + o.width - 8, o.y + 18);
      context.moveTo(o.x + 8, o.y + 38);
      context.lineTo(o.x + o.width - 8, o.y + 38);
      context.stroke();
    } else if (o.kind === 'oven') {
      context.fillStyle = PALETTE.oven;
      roundRect(o.x, o.y, o.width, o.height, 8);
      context.fill();
      context.fillStyle = PALETTE.ovenFire;
      roundRect(o.x + 14, o.y + 34, o.width - 28, 52, 6);
      context.fill();
      context.fillStyle = '#fde68a';
      context.beginPath();
      context.arc(o.x + o.width / 2, o.y + 60, 12, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#e7e5e4';
      context.fillRect(o.x + 14, o.y + 8, 18, 10);
      context.fillRect(o.x + o.width - 32, o.y + 8, 18, 10);
    } else if (o.kind === 'knife') {
      // A carving knife hanging from a wire: slide under it.
      context.strokeStyle = '#a8a29e';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(o.x + o.width / 2, 0);
      context.lineTo(o.x + o.width / 2, o.y);
      context.stroke();
      context.fillStyle = PALETTE.knifeHandle;
      context.fillRect(o.x + o.width / 2 - 4, o.y, 8, 10);
      context.fillStyle = PALETTE.knifeBlade;
      context.beginPath();
      context.moveTo(o.x, o.y + 10);
      context.lineTo(o.x + o.width, o.y + 10);
      context.lineTo(o.x + o.width / 2, o.y + o.height);
      context.closePath();
      context.fill();
    } else {
      // A meat hook on a chain: slide under it.
      context.strokeStyle = '#78716c';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(o.x + o.width / 2, 0);
      context.lineTo(o.x + o.width / 2, o.y);
      context.stroke();
      context.strokeStyle = '#d6d3d1';
      context.lineWidth = 5;
      context.beginPath();
      context.arc(o.x + o.width / 2, o.y + 10, 12, Math.PI * 0.2, Math.PI * 1.1);
      context.stroke();
    }
  }

  function drawPickup(p, elapsed) {
    const bob = Math.sin(elapsed * 5 + p.x * 0.02) * 4;
    const y = p.y + bob;
    if (p.kind === 'corn') {
      context.fillStyle = PALETTE.corn;
      roundRect(p.x, y, p.width, p.height, 8);
      context.fill();
      context.fillStyle = '#a16207';
      for (let i = 0; i < 3; i += 1) context.fillRect(p.x + 5 + i * 8, y + 5, 3, p.height - 10);
    } else if (p.kind === 'feather') {
      context.fillStyle = PALETTE.feather;
      context.beginPath();
      context.ellipse(p.x + 13, y + 13, 8, 14, 0.5, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#b45309';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(p.x + 13, y + 2);
      context.lineTo(p.x + 13, y + 24);
      context.stroke();
    } else {
      context.fillStyle = PALETTE.gravy;
      roundRect(p.x, y + 8, p.width, 16, 6);
      context.fill();
      context.fillStyle = '#92400e';
      context.beginPath();
      context.ellipse(p.x + 15, y + 10, 12, 5, 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  // --- HUD ---
  function drawHud(state, best) {
    context.fillStyle = 'rgba(28,16,8,0.72)';
    roundRect(16, 14, 760, 54, 10);
    context.fill();
    text(scoreLabel(Math.floor(state.score)), 32, 50, 26, PALETTE.text);
    text(distLabel(Math.floor(state.distanceM)) + ' m', 220, 50, 26, PALETTE.text);
    text(STAGES[state.stage - 1].name, 380, 50, 26, PALETTE.gold);
    // Lives as hearts.
    for (let i = 0; i < LIVES; i += 1) {
      const x = 600 + i * 34;
      context.fillStyle = i < state.lives ? PALETTE.red : 'rgba(255,255,255,0.25)';
      context.beginPath();
      context.arc(x, 40, 9, 0, Math.PI * 2);
      context.arc(x + 14, 40, 9, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(x - 7, 44);
      context.lineTo(x + 21, 44);
      context.lineTo(x + 7, 58);
      context.closePath();
      context.fill();
    }
    // Farmer meter: how close the farmer is.
    const gapMax = FARMER.baseGap + LIVES * FARMER.gapPerLife;
    const gapNow = FARMER.baseGap + state.lives * FARMER.gapPerLife;
    context.fillStyle = 'rgba(28,16,8,0.72)';
    roundRect(900, 14, 364, 54, 10);
    context.fill();
    text('FARMER', 916, 50, 22, PALETTE.muted);
    context.fillStyle = '#451a03';
    context.fillRect(1010, 30, 220, 16);
    context.fillStyle = state.lives === 1 ? PALETTE.red : PALETTE.gold;
    context.fillRect(1010, 30, Math.max(8, (220 * gapNow) / gapMax), 16);
    text(bestLabel(best), 1010, 64, 14, PALETTE.muted);
    // Escape progress bar.
    context.fillStyle = 'rgba(28,16,8,0.72)';
    roundRect(16, 78, 1248, 18, 9);
    context.fill();
    context.fillStyle = PALETTE.green;
    context.fillRect(16, 78, Math.max(10, (1248 * state.distanceM) / ESCAPE_M), 18);
    text(`ESCAPE ${Math.floor(state.distanceM)} / ${ESCAPE_M} m`, 640, 94, 15, PALETTE.text, 'center');
  }

  // --- panels ---
  function drawPanel(lines, prompt) {
    const height = PANEL.top + PANEL.bottom + lines.length * PANEL.line;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(28,16,8,0.88)';
    roundRect(x, y, PANEL.width, height, 16);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    roundRect(x, y, PANEL.width, height, 16);
    context.stroke();
    let cy = y + PANEL.top;
    for (const line of lines) {
      text(line.text, FIELD.width / 2, cy, line.size, line.color || PALETTE.text, 'center');
      cy += PANEL.line;
    }
    if (prompt) text(prompt, FIELD.width / 2, y + height - 30, 22, PALETTE.gold, 'center');
  }

  function draw(state, screen, best) {
    resize();
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    const stage = STAGES[state.stage - 1];
    const scroll = state.distancePx;
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    drawSky(stage, scroll);
    drawBackdrop(stage, scroll);

    const blink = state.turkey.invulnerable > 0 && Math.floor(state.elapsed * 10) % 2 === 0;
    if (screen === SCREEN_TITLE) {
      // The title screen plays the world behind it, harmlessly.
      for (const o of state.obstacles) if (o.active) drawObstacle(o);
      if (!blink) drawTurkey(state.turkey, state.elapsed);
      drawFarmer(state.turkey.x - FARMER.baseGap - LIVES * FARMER.gapPerLife - FARMER.width, state.elapsed);
      drawPanel(
        [
          { text: 'PARDON RUN', size: 64, color: PALETTE.gold },
          { text: "The turkey's last Thanksgiving", size: 26, color: PALETTE.muted },
          { text: 'Run 2,400 m. Jump the fences, hay and ovens.', size: 24 },
          { text: 'Slide under the carving knives and meat hooks.', size: 24 },
          { text: 'The farmer is right behind you. Do not stop.', size: 24 },
          { text: 'Space / Up: jump    Down: slide    P: pause', size: 22, color: PALETTE.muted },
        ],
        best > 0 ? `Best ${best}  —  press Space or click to run` : 'Press Space or click to run',
      );
      return;
    }

    for (const p of state.pickups) if (p.active) drawPickup(p, state.elapsed);
    for (const o of state.obstacles) if (o.active) drawObstacle(o);
    drawFarmer(state.turkey.x - FARMER.baseGap - state.lives * FARMER.gapPerLife - FARMER.width, state.elapsed);
    if (!blink) drawTurkey(state.turkey, state.elapsed);
    drawHud(state, best);

    if (screen === SCREEN_PAUSED) {
      drawPanel([{ text: 'Paused', size: 48, color: PALETTE.gold }], 'Press P or Space to keep running');
    } else if (screen === SCREEN_OVER) {
      if (state.escaped) {
        drawPanel(
          [
            { text: 'PARDONED!', size: 56, color: PALETTE.green },
            { text: 'You outran the farmer and escaped Thanksgiving.', size: 24 },
            { text: `Score ${Math.floor(state.score)}   •   ${Math.floor(state.distanceM)} m`, size: 26 },
            { text: `Best ${best}`, size: 22, color: PALETTE.muted },
          ],
          'Press Space or click to run again',
        );
      } else {
        drawPanel(
          [
            { text: 'CAUGHT!', size: 56, color: PALETTE.red },
            { text: 'The farmer got you. Thanksgiving dinner it is.', size: 24 },
            { text: `Score ${Math.floor(state.score)}   •   ${Math.floor(state.distanceM)} m`, size: 26 },
            { text: `Best ${best}`, size: 22, color: PALETTE.muted },
          ],
          'Press Space or click to try again',
        );
      }
    }
  }

  return { draw, resize };
}
