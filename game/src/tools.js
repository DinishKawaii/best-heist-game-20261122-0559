// tools.js — tiga tool pencuri, semuanya berbayar dari dompet koin:
// koin pengalih perhatian, EMP pemati kamera, dan asap penahan pandangan.

import {
  TOOL_COIN_COST,
  TOOL_EMP_COST,
  TOOL_SMOKE_COST,
  EMP_DURATION,
  SMOKE_DURATION,
  COIN_NOISE_RADIUS,
} from './config.js';

export function createTools() {
  return {
    coinsThrown: [], // {x, y, timer} — koin yang sedang berbunyi di lantai
    smokes: [], // {x, y, timer} — awan asap yang menahan pandangan
    empFlashes: [], // {timer} — kilatan saat EMP dipakai

    // Lempar koin ke (x,y). Koin berdenting, penjaga di sekitar mendatangi bunyinya.
    throwCoin(game, x, y) {
      if (game.coins < TOOL_COIN_COST) return { ok: false, reason: 'Koin tidak cukup' };
      game.coins -= TOOL_COIN_COST;
      this.coinsThrown.push({ x, y, timer: 3.5 });
      for (const guard of game.guards) {
        const d = Math.hypot(guard.x - x, guard.y - y);
        if (d < COIN_NOISE_RADIUS) guard.hearNoise(x, y);
      }
      game.audio.playCoinClink();
      return { ok: true };
    },

    // EMP: matikan semua kamera beberapa detik.
    useEmp(game) {
      if (game.coins < TOOL_EMP_COST) return { ok: false, reason: 'Koin tidak cukup' };
      game.coins -= TOOL_EMP_COST;
      for (const camera of game.cameras) camera.disable(EMP_DURATION);
      this.empFlashes.push({ timer: 0.5 });
      game.audio.playEmpZap();
      return { ok: true };
    },

    // Asap: awan di posisi pencuri; siapa pun di dalam asap tidak bisa dilihat.
    useSmoke(game) {
      if (game.coins < TOOL_SMOKE_COST) return { ok: false, reason: 'Koin tidak cukup' };
      game.coins -= TOOL_SMOKE_COST;
      this.smokes.push({ x: game.thief.x, y: game.thief.y, timer: SMOKE_DURATION });
      game.audio.playSmokeHiss();
      return { ok: true };
    },

    // Apakah titik (x,y) tertutup asap? Dipakai deteksi pandangan.
    pointInSmoke(x, y) {
      for (const s of this.smokes) {
        if (Math.hypot(x - s.x, y - s.y) < 62) return true;
      }
      return false;
    },

    update(dt) {
      for (const c of this.coinsThrown) c.timer -= dt;
      this.coinsThrown = this.coinsThrown.filter((c) => c.timer > 0);
      for (const s of this.smokes) s.timer -= dt;
      this.smokes = this.smokes.filter((s) => s.timer > 0);
      for (const f of this.empFlashes) f.timer -= dt;
      this.empFlashes = this.empFlashes.filter((f) => f.timer > 0);
    },
  };
}

// Daftar tool untuk HUD: tombol, nama, harga, dan apa yang terjadi.
export const TOOL_LIST = [
  { key: '1', name: 'KOIN', cost: TOOL_COIN_COST, hint: 'klik: lempar, penjaga mendatangi bunyi' },
  { key: '2', name: 'EMP', cost: TOOL_EMP_COST, hint: 'matikan semua kamera 6 detik' },
  { key: '3', name: 'ASAP', cost: TOOL_SMOKE_COST, hint: 'asap 5 detik, pandangan terhalang' },
];
