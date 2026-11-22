// main.js — orkestra game: loop, status (title/playing/caught/win), gerak pencuri,
// deteksi pandangan, alarm meter, loot, dan pemakaian tool. Satu-satunya file
// yang tahu input, autopilot, dan mode ?shot= sekaligus.

import {
  LEVELS,
  START_COINS,
  THIEF_SPEED,
  THIEF_SPRINT_SPEED,
  ALARM_RISE_CLOSE,
  ALARM_RISE_FAR,
  ALARM_DECAY,
  ALARM_CAUGHT_AT,
  ALARM_CHASE_AT,
  GUARD_VIEW_RANGE,
} from './config.js';
import { makeSeededRandom } from './random.js';
import { createInput } from './input.js';
import { createWorld } from './world.js';
import { createGuards } from './guards.js';
import { createCameras } from './cameras.js';
import { createTools } from './tools.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { applyShotState } from './shots.js';
import { createAutopilot } from './autopilot.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '1') || 1;
const random = makeSeededRandom(seed);
void random;

const input = createInput(canvas);
const audio = createAudio();
const renderer = createRenderer(canvas);

const game = {
  phase: 'title', // title | playing | caught | levelClear | win
  time: 0,
  elapsed: 0,
  alarm: 0,
  peakAlarm: 0,
  score: 0,
  coins: START_COINS,
  levelIndex: 0,
  world: null,
  guards: [],
  cameras: [],
  tools: createTools(),
  audio,
  thief: { x: 0, y: 0, moving: false, sprinting: false },
  message: '',
  messageTimer: 0,
  winTimeText: '',
  levelClearTimer: 0,
  anyChasing: false,
  autopilot: null,
  autopilotMove: { x: 0, y: 0, sprint: false },
  noiseTimer: 0,
  stepTimer: 0,
  finished: false,
};

function setMessage(text, seconds) {
  game.message = text;
  game.messageTimer = seconds || 2.5;
  if (statusEl) statusEl.textContent = text;
}

game.loadLevel = function loadLevel(index) {
  game.levelIndex = index;
  game.world = createWorld(index);
  game.guards = createGuards(LEVELS[index].guards);
  game.cameras = createCameras(LEVELS[index].cameras);
  game.tools = createTools();
  game.thief.x = LEVELS[index].thiefStart.x;
  game.thief.y = LEVELS[index].thiefStart.y;
  game.thief.moving = false;
  game.alarm = 0;
  game.levelClearTimer = 0;
  game.noiseTimer = 0;
};

game.useTool = function useTool(name, tx, ty) {
  if (game.phase !== 'playing') return;
  let result;
  if (name === 'coin') {
    // Target dari parameter (autopilot) atau dari posisi mouse (pemain).
    const mouse = input.mousePosition();
    const x = typeof tx === 'number' ? tx : mouse.x;
    const y = typeof ty === 'number' ? ty : mouse.y;
    result = game.tools.throwCoin(game, x, y);
  } else if (name === 'emp') {
    result = game.tools.useEmp(game);
  } else if (name === 'smoke') {
    result = game.tools.useSmoke(game);
  }
  if (result && !result.ok) setMessage(result.reason, 2);
};

function formatTime(totalSeconds) {
  const total = Math.floor(totalSeconds);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function reportResult(status, detail) {
  if (game.finished) return;
  game.finished = true;
  const payload = {
    status,
    level: game.levelIndex + 1,
    score: game.score,
    coins: game.coins,
    alarm: Math.round(game.alarm),
    peakAlarm: Math.round(game.peakAlarm),
    time: Number(game.elapsed.toFixed(1)),
    detail: detail || '',
  };
  window.__gameResult = payload;
  document.title = `RESULT ${status}`;
  if (resultEl) resultEl.textContent = JSON.stringify(payload);
}

function startGame() {
  audio.unlock();
  audio.startDrone();
  game.phase = 'playing';
  game.elapsed = 0;
  game.score = 0;
  game.coins = START_COINS;
  game.peakAlarm = 0;
  game.loadLevel(0);
  setMessage('Ambil artefak, lalu kabur lewat EXIT!', 3);
}

function restartLevel() {
  game.loadLevel(game.levelIndex);
  game.phase = 'playing';
  setMessage('Coba lagi — baca arah cone sebelum bergerak.', 3);
}

function restartAll() {
  game.finished = false;
  startGame();
}

function updatePlaying(dt) {
  game.elapsed += dt;
  game.time += dt;

  // Gerak pencuri: dari keyboard, atau dari autopilot saat mode autopilot.
  let move;
  let sprint = false;
  if (game.autopilot) {
    const auto = game.autopilot.update(dt);
    move = { x: auto.x, y: auto.y };
    sprint = Boolean(auto.sprint);
  } else {
    move = input.moveVector();
    sprint = input.isSprinting();
  }
  const speed = sprint ? THIEF_SPRINT_SPEED : THIEF_SPEED;
  game.thief.moving = move.x !== 0 || move.y !== 0;
  game.thief.sprinting = sprint && game.thief.moving;
  if (game.thief.moving) {
    const next = game.world.slideMove(
      game.thief.x, game.thief.y, 13,
      move.x * speed * dt, move.y * speed * dt,
    );
    game.thief.x = next.x;
    game.thief.y = next.y;
    // Langkah kaki bersuara pelan setiap 0,35 detik.
    game.stepTimer -= dt;
    if (game.stepTimer <= 0) {
      game.stepTimer = 0.35;
      if (!game.autopilot) audio.playStep();
    }
    // Lari berisik: penjaga dekat mendatangi sumber suara.
    if (game.thief.sprinting) {
      game.noiseTimer -= dt;
      if (game.noiseTimer <= 0) {
        game.noiseTimer = 0.6;
        for (const guard of game.guards) {
          const d = Math.hypot(guard.x - game.thief.x, guard.y - game.thief.y);
          if (d < 170) guard.hearNoise(game.thief.x, game.thief.y);
        }
      }
    }
  }

  game.tools.update(dt);
  for (const camera of game.cameras) camera.update(dt);

  // Deteksi: penjaga dan kamera yang melihat pencuri menaikkan alarm.
  let seen = false;
  let closestSeen = Infinity;
  const inSmoke = game.tools.pointInSmoke(game.thief.x, game.thief.y);
  if (!inSmoke) {
    for (const guard of game.guards) {
      const check = guard.canSeePoint(game.thief.x, game.thief.y, game.world);
      if (check.sees) {
        seen = true;
        closestSeen = Math.min(closestSeen, check.dist);
        guard.lastSeenX = game.thief.x;
        guard.lastSeenY = game.thief.y;
        guard.lastSeenTimer = 3;
        if (game.alarm >= ALARM_CHASE_AT) guard.state = 'chase';
      }
    }
    for (const camera of game.cameras) {
      const check = camera.canSeePoint(game.thief.x, game.thief.y, game.world);
      if (check.sees) {
        seen = true;
        closestSeen = Math.min(closestSeen, check.dist);
      }
    }
  }
  if (seen) {
    const near = closestSeen < GUARD_VIEW_RANGE * 0.45;
    game.alarm += (near ? ALARM_RISE_CLOSE : ALARM_RISE_FAR) * dt;
  } else {
    game.alarm -= ALARM_DECAY * dt;
  }
  game.alarm = Math.max(0, Math.min(100, game.alarm));
  game.peakAlarm = Math.max(game.peakAlarm, game.alarm);
  audio.setAlarmLevel(game.alarm);

  for (const guard of game.guards) {
    guard.update(dt, game.world, game.thief, game.alarm);
    if (guard.touchesThief(game.thief)) {
      return caught('Penjaga menangkapmu dari dekat.');
    }
  }
  game.anyChasing = game.guards.some((g) => g.state === 'chase');

  if (game.alarm >= ALARM_CAUGHT_AT) {
    return caught('Alarm mencapai 100 — lockdown!');
  }

  // Loot utama.
  if (!game.world.lootTaken) {
    const loot = game.world.def.loot;
    if (Math.hypot(game.thief.x - loot.x, game.thief.y - loot.y) < 32) {
      game.world.lootTaken = true;
      game.score += game.world.def.lootValue;
      game.coins += 150;
      audio.playLootFanfare();
      setMessage(`${game.world.def.lootName} didapat! Sekarang ke EXIT hijau!`, 3);
    }
  }
  // Loot kecil.
  for (const item of game.world.smallLoot) {
    if (!item.taken && Math.hypot(game.thief.x - item.x, game.thief.y - item.y) < 22) {
      item.taken = true;
      game.score += item.value;
      game.coins += Math.floor(item.value / 2);
      audio.playPickup();
    }
  }

  // EXIT: hanya terbuka kalau loot sudah diambil.
  const exit = game.world.def.exit;
  const inExit = game.thief.x > exit.x && game.thief.x < exit.x + exit.w
    && game.thief.y > exit.y && game.thief.y < exit.y + exit.h;
  if (inExit && game.world.lootTaken) {
    if (game.levelIndex + 1 >= LEVELS.length) {
      game.phase = 'win';
      game.winTimeText = formatTime(game.elapsed);
      audio.playWinJingle();
      audio.setAlarmLevel(0);
      reportResult('WIN', 'Semua ruangan selesai.');
    } else {
      game.phase = 'levelClear';
      game.levelClearTimer = 1.4;
      audio.playPickup();
    }
  }

  if (game.messageTimer > 0) {
    game.messageTimer -= dt;
    if (game.messageTimer <= 0) game.message = '';
  }
}

function caught(reason) {
  game.phase = 'caught';
  audio.playCaughtSting();
  audio.setAlarmLevel(0);
  setMessage(reason, 4);
  reportResult('LOSE', reason);
}

function handleInput() {
  if (input.wasPressed('Enter') || input.wasPressed(' ')) {
    audio.unlock();
    if (game.phase === 'title') startGame();
    return;
  }
  if (input.wasPressed('m') || input.wasPressed('M')) {
    const muted = audio.toggleMute();
    setMessage(muted ? 'Suara mati.' : 'Suara hidup.', 1.5);
  }
  if (input.wasPressed('r') || input.wasPressed('R')) {
    if (game.phase === 'caught') restartLevel();
    else if (game.phase === 'win') restartAll();
    return;
  }
  if (game.phase === 'title') {
    const click = input.takeMouseClick();
    if (click) startGame();
    return;
  }
  if (game.phase !== 'playing') return;
  if (input.wasPressed('1')) game.useTool('coin');
  if (input.wasPressed('2')) game.useTool('emp');
  if (input.wasPressed('3')) game.useTool('smoke');
  const click = input.takeMouseClick();
  if (click) {
    // Klik kotak tool di HUD memakai tool itu; klik di arena melempar koin.
    const toolBoxes = [
      { x0: 786, x1: 890, tool: 'coin' },
      { x0: 898, x1: 1002, tool: 'emp' },
      { x0: 1010, x1: 1114, tool: 'smoke' },
    ];
    let used = false;
    if (click.y >= 12 && click.y <= 62) {
      for (const box of toolBoxes) {
        if (click.x >= box.x0 && click.x <= box.x1) {
          game.useTool(box.tool);
          used = true;
        }
      }
    }
    if (!used) {
      const result = game.tools.throwCoin(game, click.x, click.y);
      if (!result.ok) setMessage(result.reason, 2);
    }
  }
}

let lastTimestamp = 0;
function frame(timestamp) {
  const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000 || 0.016);
  lastTimestamp = timestamp;
  handleInput();
  if (game.phase === 'playing') {
    updatePlaying(dt);
  } else if (game.phase === 'levelClear') {
    game.time += dt;
    game.levelClearTimer -= dt;
    if (game.levelClearTimer <= 0) {
      game.loadLevel(game.levelIndex + 1);
      if (game.autopilot) game.autopilot.reset();
      game.phase = 'playing';
      setMessage(`${game.world.def.name} — ${game.world.def.roomName}. ${game.world.def.lootName} menantimu.`, 3);
    }
  } else {
    game.time += dt;
  }
  renderer.render(game);
  input.endFrame();
  if (game.autopilot && !game.finished && params.get('debug') === '1' && resultEl) {
    resultEl.textContent = JSON.stringify({
      status: 'RUNNING',
      level: game.levelIndex + 1,
      phase: game.phase,
      thief: [Math.round(game.thief.x), Math.round(game.thief.y)],
      alarm: Math.round(game.alarm),
      lootTaken: game.world.lootTaken,
      waypoint: game.autopilot.state.waypointIndex,
      mode: game.autopilot.state.mode,
      blocker: game.autopilot.state.blocker,
      wait: Number(game.autopilot.state.waitTimer.toFixed(1)),
      score: game.score,
      coins: game.coins,
      time: Number(game.elapsed.toFixed(1)),
      guards: game.guards.map((g) => [Math.round(g.x), Math.round(g.y), g.state]),
      errors: window.__gameErrors || [],
    });
  }
  if (game.autopilot && game.finished) return; // berhenti setelah hasil tercatat
  requestAnimationFrame(frame);
}

// Tangkap error JS supaya playtest headless bisa membacanya dari DOM.
window.addEventListener('error', (event) => {
  window.__gameErrors = window.__gameErrors || [];
  window.__gameErrors.push(String(event.message || event.error));
  if (resultEl) resultEl.textContent = JSON.stringify({ status: 'JS_ERROR', error: String(event.message || event.error) });
});

// Mode screenshot: satu frame deterministik, tanpa loop.
const shot = params.get('shot');
if (shot) {
  game.loadLevel(shot === 'start' ? 0 : shot === 'play' ? 1 : 2);
  applyShotState(game, shot);
  renderer.render(game);
  document.title = `shot:${shot}`;
} else {
  game.loadLevel(0);
  if (params.get('mode') === 'autopilot') {
    game.autopilot = createAutopilot(game);
    game.phase = 'playing';
    game.elapsed = 0;
    game.score = 0;
    game.coins = START_COINS;
    game.peakAlarm = 0;
    // Autopilot boleh jalan lama: laporkan timeout kalau 10 menit game berlalu.
    const timeoutAt = 600;
    const watchdog = setInterval(() => {
      if (game.finished) {
        clearInterval(watchdog);
        return;
      }
      if (game.elapsed > timeoutAt) {
        reportResult('TIMEOUT', `Autopilot belum menang setelah ${timeoutAt} detik game.`);
      }
    }, 1000);
    void watchdog;
  }
  requestAnimationFrame(frame);
}
