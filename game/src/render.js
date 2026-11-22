// render.js — semua gambar digambar dari kode di canvas: lantai, dinding,
// vision cone penjaga dan kamera, pencuri, loot, sampai HUD dan layar judul.
// Tidak ada gambar luar: semuanya bentuk, warna, dan teks.

import {
  VIEW_WIDTH,
  VIEW_HEIGHT,
  HUD_HEIGHT,
  PLAY_TOP,
  GAME_TITLE,
  TOOL_COIN_COST,
  TOOL_EMP_COST,
  TOOL_SMOKE_COST,
} from './config.js';
import { TOOL_LIST } from './tools.js';

function drawCone(ctx, x, y, angle, halfAngle, range, color) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawCircle(ctx, x, y, r, fill, stroke) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawText(ctx, text, x, y, size, color, align, weight) {
  ctx.fillStyle = color;
  ctx.font = `${weight || 'bold'} ${size}px Verdana, sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function alarmColor(alarm) {
  if (alarm < 35) return '#37d67a';
  if (alarm < 65) return '#ffc233';
  return '#ff3b30';
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawFloor(game) {
    // Lantai museum gelap dengan pola ubin halus.
    ctx.fillStyle = '#1b2130';
    ctx.fillRect(0, PLAY_TOP, VIEW_WIDTH, VIEW_HEIGHT - PLAY_TOP);
    ctx.fillStyle = '#202839';
    const tile = 64;
    for (let y = PLAY_TOP; y < VIEW_HEIGHT; y += tile) {
      for (let x = 0; x < VIEW_WIDTH; x += tile) {
        if (((x / tile) + (y / tile)) % 2 === 0) {
          ctx.fillRect(x, y, tile, tile);
        }
      }
    }
    // Karpet merah di jalur utama tiap ruangan.
    for (const carpet of game.world.def.carpets || []) {
      ctx.fillStyle = '#6e1f2a';
      ctx.fillRect(carpet.x, carpet.y, carpet.w, carpet.h);
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 3;
      ctx.strokeRect(carpet.x + 3, carpet.y + 3, carpet.w - 6, carpet.h - 6);
    }
  }

  function drawWallsAndCases(game) {
    for (const w of game.world.walls) {
      ctx.fillStyle = '#39466a';
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = '#d8b64a';
      ctx.lineWidth = 3;
      ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
    }
    // Etalase kaca dengan benda kecil di dalamnya.
    for (const c of game.world.def.cases || []) {
      ctx.fillStyle = 'rgba(150, 200, 255, 0.22)';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x, c.y, c.w, c.h);
      drawCircle(ctx, c.x + c.w / 2, c.y + c.h / 2, 6, '#e8c766');
    }
  }

  function drawExit(game) {
    const e = game.world.def.exit;
    const pulse = 0.55 + Math.sin(game.time * 3) * 0.2;
    ctx.fillStyle = `rgba(55, 214, 122, ${pulse})`;
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.strokeStyle = '#d8ffe9';
    ctx.lineWidth = 3;
    ctx.strokeRect(e.x, e.y, e.w, e.h);
    drawText(ctx, 'EXIT', e.x + e.w / 2, e.y + e.h / 2 - 10, 20, '#062b16', 'center');
    drawText(ctx, '▼', e.x + e.w / 2, e.y + e.h / 2 + 14, 16, '#062b16', 'center');
  }

  function drawLoot(game) {
    const def = game.world.def;
    const loot = def.loot;
    if (!game.world.lootTaken) {
      // Cahaya emas berdenyut di sekitar artefak.
      const glow = 0.35 + Math.sin(game.time * 2.5) * 0.15;
      const grad = ctx.createRadialGradient(loot.x, loot.y, 4, loot.x, loot.y, 64);
      grad.addColorStop(0, `rgba(255, 215, 90, ${glow})`);
      grad.addColorStop(1, 'rgba(255, 215, 90, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(loot.x - 64, loot.y - 64, 128, 128);
      // Pedestal + patung Garuda bergaya sederhana.
      ctx.fillStyle = '#3a2f18';
      ctx.fillRect(loot.x - 22, loot.y + 8, 44, 22);
      ctx.fillStyle = '#ffd75a';
      ctx.beginPath();
      ctx.moveTo(loot.x, loot.y - 22);
      ctx.lineTo(loot.x + 12, loot.y + 6);
      ctx.lineTo(loot.x - 12, loot.y + 6);
      ctx.closePath();
      ctx.fill();
      drawCircle(ctx, loot.x, loot.y - 26, 7, '#ffe9a3', '#b8860b');
      drawText(ctx, '★ ' + def.lootName.toUpperCase() + ' ★', loot.x, loot.y - 48, 15, '#ffe9a3', 'center');
    }
    for (const item of game.world.smallLoot) {
      if (item.taken) continue;
      if (item.kind === 'gem') {
        ctx.fillStyle = '#7ee7ff';
        ctx.beginPath();
        ctx.moveTo(item.x, item.y - 10);
        ctx.lineTo(item.x + 9, item.y);
        ctx.lineTo(item.x, item.y + 10);
        ctx.lineTo(item.x - 9, item.y);
        ctx.closePath();
        ctx.fill();
      } else {
        drawCircle(ctx, item.x, item.y, 7, '#ffd75a', '#b8860b');
        drawText(ctx, '$', item.x, item.y, 10, '#7a5b00', 'center');
      }
    }
  }

  function drawThief(game) {
    const t = game.thief;
    const bob = Math.sin(game.time * 10) * (t.moving ? 1.5 : 0);
    // Bayangan.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(t.x, t.y + 13, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Jubah ungu gelap + tudung.
    ctx.fillStyle = '#5b3a8e';
    ctx.beginPath();
    ctx.moveTo(t.x, t.y - 16 + bob);
    ctx.lineTo(t.x + 13, t.y + 12);
    ctx.lineTo(t.x - 13, t.y + 12);
    ctx.closePath();
    ctx.fill();
    drawCircle(ctx, t.x, t.y - 8 + bob, 9, '#2d1b4d', '#c9a227');
    // Topeng putih kecil.
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(t.x - 5, t.y - 10 + bob, 10, 4);
    drawText(ctx, 'PENCURI', t.x, t.y + 26, 10, '#d9c2ff', 'center');
  }

  function drawGuards(game) {
    for (const guard of game.guards) {
      const color = guard.state === 'chase'
        ? 'rgba(255, 70, 60, 0.38)'
        : guard.state === 'investigate'
          ? 'rgba(255, 200, 60, 0.34)'
          : 'rgba(255, 220, 90, 0.30)';
      drawCone(ctx, guard.x, guard.y, guard.angle, 0.62, 225, color);
    }
    for (const guard of game.guards) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(guard.x, guard.y + 13, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Seragam biru tua + topi.
      drawCircle(ctx, guard.x, guard.y, 13, '#1f3a6e', '#9db8e8');
      ctx.fillStyle = '#16294d';
      ctx.fillRect(guard.x - 9, guard.y - 20, 18, 7);
      drawCircle(ctx, guard.x, guard.y - 2, 4, '#f2c9a0');
      const label = guard.state === 'chase' ? '!' : guard.state === 'investigate' ? '?' : '';
      if (label) drawText(ctx, label, guard.x, guard.y - 30, 22, '#ff5b4d', 'center');
      drawText(ctx, 'PENJAGA', guard.x, guard.y + 26, 10, '#bcd2ff', 'center');
    }
  }

  function drawCameras(game) {
    for (const camera of game.cameras) {
      if (!camera.disabled) {
        drawCone(ctx, camera.x, camera.y, camera.angle, 0.55, 240, 'rgba(255, 90, 110, 0.28)');
      }
      // Badan kamera di dinding.
      drawCircle(ctx, camera.x, camera.y, 10, camera.disabled ? '#555c66' : '#3a4252', '#c9c9c9');
      const blink = camera.disabled ? '#444' : (Math.sin(game.time * 6) > 0 ? '#ff2d2d' : '#7a1010');
      drawCircle(ctx, camera.x, camera.y, 4, blink);
      drawText(ctx, camera.disabled ? 'KAMERA MATI' : 'KAMERA', camera.x, camera.y + 24, 10, camera.disabled ? '#9aa3ad' : '#ff9aa8', 'center');
    }
  }

  function drawToolsOnFloor(game) {
    for (const coin of game.tools.coinsThrown) {
      drawCircle(ctx, coin.x, coin.y, 6, '#ffd75a', '#b8860b');
      const ring = (3.5 - coin.timer) * 22;
      ctx.strokeStyle = 'rgba(255, 215, 90, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 8 + ring, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const smoke of game.tools.smokes) {
      const alpha = Math.min(0.55, smoke.timer * 0.2);
      const grad = ctx.createRadialGradient(smoke.x, smoke.y, 4, smoke.x, smoke.y, 62);
      grad.addColorStop(0, `rgba(200, 205, 215, ${alpha})`);
      grad.addColorStop(1, 'rgba(200, 205, 215, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(smoke.x - 62, smoke.y - 62, 124, 124);
      drawText(ctx, 'ASAP', smoke.x, smoke.y, 11, '#e8ecf2', 'center');
    }
    for (const flash of game.tools.empFlashes) {
      ctx.fillStyle = `rgba(140, 220, 255, ${flash.timer})`;
      ctx.fillRect(0, PLAY_TOP, VIEW_WIDTH, VIEW_HEIGHT - PLAY_TOP);
    }
  }

  function drawHud(game) {
    // Bar atas gelap.
    ctx.fillStyle = '#0d1220';
    ctx.fillRect(0, 0, VIEW_WIDTH, HUD_HEIGHT);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(0, HUD_HEIGHT - 3, VIEW_WIDTH, 3);

    drawText(ctx, GAME_TITLE.toUpperCase(), 18, 24, 20, '#ffe9a3', 'left');
    drawText(ctx, `${game.world.def.name} — ${game.world.def.roomName}`, 18, 52, 14, '#9fb4d8', 'left');

    // Alarm meter besar di tengah.
    const meterX = 470;
    const meterY = 16;
    const meterW = 300;
    const meterH = 26;
    drawText(ctx, 'ALARM', meterX - 8, meterY + meterH / 2, 16, '#ffffff', 'right');
    ctx.fillStyle = '#2a2f3d';
    roundRect(ctx, meterX, meterY, meterW, meterH, 6);
    ctx.fill();
    const fillW = Math.max(0, Math.min(1, game.alarm / 100)) * meterW;
    if (fillW > 0) {
      ctx.fillStyle = alarmColor(game.alarm);
      roundRect(ctx, meterX, meterY, fillW, meterH, 6);
      ctx.fill();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    roundRect(ctx, meterX, meterY, meterW, meterH, 6);
    ctx.stroke();
    drawText(ctx, String(Math.round(game.alarm)), meterX + meterW / 2, meterY + meterH / 2 + 1, 17, '#ffffff', 'center');
    drawText(ctx, game.world.lootTaken ? 'LOOT DIDAPAT — KE EXIT!' : `TARGET: ${game.world.def.lootName}`, meterX + meterW / 2, 58, 13, game.world.lootTaken ? '#37d67a' : '#ffd75a', 'center');

    // Loot, koin, timer di kanan.
    const rightX = VIEW_WIDTH - 18;
    drawText(ctx, `LOOT  $${game.score.toLocaleString('en-US')}`, rightX, 22, 17, '#ffd75a', 'right');
    drawText(ctx, `KOIN  ${game.coins}`, rightX, 50, 15, '#e8ecf2', 'right');

    // Tool di bawah bar: tiga kotak dengan tombol dan harga.
    const toolY = HUD_HEIGHT + 0; // digambar menempel di bawah HUD? tidak — di dalam HUD bawah.
    void toolY;
    const tools = [
      { key: '1', name: 'KOIN', cost: TOOL_COIN_COST },
      { key: '2', name: 'EMP', cost: TOOL_EMP_COST },
      { key: '3', name: 'ASAP', cost: TOOL_SMOKE_COST },
    ];
    let tx = 786;
    for (const tool of tools) {
      const afford = game.coins >= tool.cost;
      ctx.fillStyle = afford ? '#233250' : '#1a1d26';
      roundRect(ctx, tx, 12, 104, 50, 7);
      ctx.fill();
      ctx.strokeStyle = afford ? '#c9a227' : '#555c66';
      ctx.lineWidth = 2;
      roundRect(ctx, tx, 12, 104, 50, 7);
      ctx.stroke();
      drawText(ctx, `[${tool.key}] ${tool.name}`, tx + 52, 28, 13, afford ? '#ffffff' : '#8a919e', 'center');
      drawText(ctx, `$${tool.cost}`, tx + 52, 48, 13, afford ? '#ffd75a' : '#8a919e', 'center');
      tx += 112;
    }
    void TOOL_LIST;
  }

  function drawTimer(game) {
    const total = Math.floor(game.elapsed);
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    drawText(ctx, `WAKTU ${mm}:${ss}`, 150, VIEW_HEIGHT - 16, 14, '#c8d2e8', 'left');
    drawText(ctx, 'WASD gerak • SHIFT lari • 1 koin • 2 EMP • 3 asap • klik lempar koin', VIEW_WIDTH / 2, VIEW_HEIGHT - 16, 13, '#8a97ad', 'center');
  }

  function drawBanner(title, subtitle, color, box) {
    const b = box || { x: 240, y: 190, w: 800, h: 300 };
    // Pita ringkas (judul) tidak menggelapkan layar; kotak besar menutup layar.
    if (b.h >= 200) {
      ctx.fillStyle = 'rgba(6, 8, 16, 0.72)';
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    }
    ctx.fillStyle = 'rgba(13, 18, 32, 0.95)';
    roundRect(ctx, b.x, b.y, b.w, b.h, 14);
    ctx.fill();
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 3;
    roundRect(ctx, b.x, b.y, b.w, b.h, 14);
    ctx.stroke();
    const titleSize = b.h < 200 ? 34 : 44;
    drawText(ctx, title, VIEW_WIDTH / 2, b.y + (b.h < 200 ? 44 : 80), titleSize, color, 'center');
    drawText(ctx, subtitle, VIEW_WIDTH / 2, b.y + (b.h < 200 ? 82 : 140), b.h < 200 ? 15 : 19, '#e8ecf2', 'center');
    return b;
  }

  function render(game) {
    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    drawFloor(game);
    drawExit(game);
    drawLoot(game);
    drawToolsOnFloor(game);
    drawGuards(game);
    drawCameras(game);
    drawThief(game);
    drawHud(game);
    drawTimer(game);

    if (game.phase === 'title') {
      // Pita judul ringkas di atas: ruangan, penjaga, dan loot tetap kelihatan.
      drawBanner(
        GAME_TITLE.toUpperCase(),
        'Museum tutup. Satu pencuri. Tiga ruangan. Jangan sampai alarm 100.',
        '#ffe9a3',
        { x: 280, y: 96, w: 720, h: 156 },
      );
      drawText(ctx, 'Ambil artefak, lalu kabur lewat EXIT hijau. Tekan ENTER / klik untuk mulai.', VIEW_WIDTH / 2, 216, 15, '#ffd75a', 'center');
      drawText(ctx, 'Penjaga berpatroli • Kamera berputar • Koin, EMP, dan asap dibeli dengan koin', VIEW_WIDTH / 2, 240, 13, '#c8d2e8', 'center');
    } else if (game.phase === 'caught') {
      drawBanner('KETAHUAN!', `Alarm mencapai 100 — petugas museum mengepungmu di ${game.world.def.roomName}.`, '#ff5b4d');
      drawText(ctx, 'Tekan R untuk mencoba lagi dari ruangan ini.', VIEW_WIDTH / 2, 390, 17, '#ffd75a', 'center');
    } else if (game.phase === 'levelClear') {
      drawBanner('RUANGAN BERSIH!', `${game.world.def.lootName} diamankan. Lanjut ke ruangan berikutnya…`, '#37d67a');
    } else if (game.phase === 'win') {
      drawBanner('HEIST BERHASIL!', `Semua artefak diamankan — Garuda Emas, Mahkota Nusantara, Keris Pusaka.`, '#ffd75a');
      drawText(ctx, `SKOR AKHIR $${game.score.toLocaleString('en-US')}   •   WAKTU ${game.winTimeText}   •   ALARM TERTINGGI ${Math.round(game.peakAlarm)}`, VIEW_WIDTH / 2, 390, 18, '#e8ecf2', 'center');
      drawText(ctx, 'Tekan R untuk bermain lagi dari awal.', VIEW_WIDTH / 2, 428, 15, '#c8d2e8', 'center');
    } else if (game.phase === 'playing' && game.anyChasing) {
      // Momen kejar-kejaran: bingkai merah berdenyut di tepi layar.
      const pulse = 0.25 + Math.sin(game.time * 8) * 0.12;
      ctx.strokeStyle = `rgba(255, 59, 48, ${pulse})`;
      ctx.lineWidth = 10;
      ctx.strokeRect(5, PLAY_TOP + 5, VIEW_WIDTH - 10, VIEW_HEIGHT - PLAY_TOP - 10);
      drawText(ctx, 'TERKEJAR! Sembunyi sampai alarm turun!', VIEW_WIDTH / 2, PLAY_TOP + 30, 20, '#ff6b61', 'center');
    }

    if (game.message) {
      drawText(ctx, game.message, VIEW_WIDTH / 2, PLAY_TOP + 58, 16, '#ffe9a3', 'center');
    }
  }

  return { render };
}
