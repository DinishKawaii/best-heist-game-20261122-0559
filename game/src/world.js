// world.js — isi ruangan yang sedang dimainkan: dinding, tabrakan, dan
// garis pandang (apakah satu titik bisa melihat titik lain tanpa terhalang dinding).

import { LEVELS, PLAY_TOP, PLAY_BOTTOM, PLAY_LEFT, PLAY_RIGHT } from './config.js';

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Apakah ruas garis (x1,y1)-(x2,y2) memotong persegi panjang r?
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  if (maxX < r.x || minX > r.x + r.w || maxY < r.y || minY > r.y + r.h) return false;
  if (x1 >= r.x && x1 <= r.x + r.w && y1 >= r.y && y1 <= r.y + r.h) return true;
  if (x2 >= r.x && x2 <= r.x + r.w && y2 >= r.y && y2 <= r.y + r.h) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  // Potong garis dengan keempat sisi persegi; t di [0,1] berarti kena.
  const tests = [];
  if (dx !== 0) {
    tests.push((r.x - x1) / dx, (r.x + r.w - x1) / dx);
  }
  if (dy !== 0) {
    tests.push((r.y - y1) / dy, (r.y + r.h - y1) / dy);
  }
  for (const t of tests) {
    if (t < 0 || t > 1) continue;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    if (px >= r.x - 0.01 && px <= r.x + r.w + 0.01 && py >= r.y - 0.01 && py <= r.y + r.h + 0.01) {
      return true;
    }
  }
  return false;
}

export function createWorld(levelIndex) {
  const def = LEVELS[levelIndex];
  const walls = def.walls.map((w) => ({ ...w }));
  const state = {
    levelIndex,
    def,
    walls,
    lootTaken: false,
    smallLoot: def.smallLoot.map((item) => ({ ...item })),
    exitReached: false,
    // Titik di dalam persegi itu terhalang dinding?
    pointBlocked(x, y) {
      if (x < PLAY_LEFT + 10 || x > PLAY_RIGHT - 10 || y < PLAY_TOP + 10 || y > PLAY_BOTTOM - 10) {
        return true;
      }
      for (const w of walls) {
        if (x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) return true;
      }
      return false;
    },
    // Apakah lingkaran (cx,cy,r) menabrak dinding? Dipakai saat pencuri bergerak.
    circleHitsWall(cx, cy, r) {
      for (const w of walls) {
        const nearestX = Math.max(w.x, Math.min(cx, w.x + w.w));
        const nearestY = Math.max(w.y, Math.min(cy, w.y + w.h));
        const dx = cx - nearestX;
        const dy = cy - nearestY;
        if (dx * dx + dy * dy < r * r) return true;
      }
      if (cx - r < PLAY_LEFT || cx + r > PLAY_RIGHT || cy - r < PLAY_TOP || cy + r > PLAY_BOTTOM) {
        return true;
      }
      return false;
    },
    // Garis pandang bersih? False kalau ada dinding di antaranya.
    hasLineOfSight(x1, y1, x2, y2) {
      for (const w of walls) {
        if (segmentHitsRect(x1, y1, x2, y2, w)) return false;
      }
      return true;
    },
    // Gerakkan lingkaran sejauh (dx,dy), geser sepanjang dinding kalau mentok.
    slideMove(cx, cy, r, dx, dy) {
      let nx = cx + dx;
      let ny = cy + dy;
      if (!this.circleHitsWall(nx, cy, r)) {
        cx = nx;
      }
      if (!this.circleHitsWall(cx, ny, r)) {
        cy = ny;
      }
      return { x: cx, y: cy };
    },
  };
  return state;
}
