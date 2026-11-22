// autopilot.js — pemain otomatis deterministik untuk playtest: mengikuti
// jalan aman tiap ruangan, berhenti saat ada cone di depan, memakai asap
// kalau terlalu lama tertahan, lalu pulang ke EXIT. Menang minimal sekali
// adalah bukti game ini bisa diselesaikan.
//
// Kuncinya adalah lookahead: sebelum melangkah, autopilot meramal posisi
// penjaga dan arah kamera 1,5 detik ke depan, dan hanya melangkah kalau
// titik itu tetap aman selama itu. Kalau posisinya sendiri diramal tidak
// aman, ia mundur ke titik jalan sebelumnya sebelum alarm sempat naik.

import { GUARD_VIEW_RANGE, CAMERA_VIEW_RANGE } from './config.js';
import { segmentHitsRect } from './world.js';

// Selisih sudut dinormalkan ke [-pi, pi].
function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createAutopilot(game) {
  const state = {
    mode: 'toLoot', // toLoot | toExit
    waypointIndex: 0,
    waitTimer: 0,
    smokeCooldown: 0,
    coinCooldown: 0,
    empCooldown: 0,
    blocker: null,
    steps: 0,
    result: null,
  };

  // Ramal posisi dan arah pandang penjaga t detik ke depan. Patroli
  // disimulasikan mengikuti titik jalurnya; penjaga yang sedang menyelidiki
  // bunyi diramal berjalan ke sumber bunyi; yang mengejar dianggap diam
  // di tempat (perkiraan pesimistis).
  function guardAtTime(guard, t) {
    if (guard.state === 'chase') return { x: guard.x, y: guard.y, angle: guard.angle };
    const wps = guard.waypoints;
    let x = guard.x;
    let y = guard.y;
    let wi = guard.waypointIndex;
    let angle = guard.angle;
    let state = guard.state;
    let remaining = t;
    let guardLoop = 0;
    while (remaining > 0 && guardLoop < 12) {
      guardLoop += 1;
      let target;
      let speed = guard.speed;
      if (state === 'patrol') {
        target = wps[wi];
      } else if (state === 'investigate') {
        target = { x: guard.investigateX, y: guard.investigateY };
        speed = guard.speed * 1.25;
      } else {
        // return: ke titik patroli terdekat, lalu lanjut patroli.
        let best = wps[0];
        let bestDist = Infinity;
        for (const wp of wps) {
          const d = Math.hypot(wp.x - x, wp.y - y);
          if (d < bestDist) {
            bestDist = d;
            best = wp;
          }
        }
        target = best;
      }
      const dx = target.x - x;
      const dy = target.y - y;
      const dist = Math.hypot(dx, dy);
      const step = speed * remaining;
      if (dist <= step) {
        x = target.x;
        y = target.y;
        remaining -= dist / speed;
        angle = Math.atan2(dy, dx);
        if (state === 'patrol') {
          wi = (wi + 1) % wps.length;
        } else if (state === 'investigate') {
          state = 'return';
        } else {
          state = 'patrol';
          wi = wps.indexOf(target) + 1;
          if (wi >= wps.length) wi = 0;
        }
      } else {
        angle = Math.atan2(dy, dx);
        x += (dx / dist) * step;
        y += (dy / dist) * step;
        remaining = 0;
      }
    }
    return { x, y, angle };
  }

  // Arah cone kamera t detik ke depan (gerak sinus murni, bisa dihitung persis).
  function cameraAngleAtTime(camera, t) {
    return camera.baseAngle + Math.sin((camera.time + t) * camera.speed + camera.phase) * camera.sweep;
  }

  // Apakah titik (x,y) aman pada saat t detik dari sekarang? Mengembalikan
  // null kalau aman, atau penghalangnya ({kind:'guard', guard} atau
  // {kind:'camera'}) supaya autopilot tahu siapa yang harus dipancing.
  // Margin pengaman: jangkauan dan sudut cone dilebarkan supaya pencuri
  // berhenti sebelum cone sempat menyapu. Titik di dalam asap dihitung aman.
  function checkSafetyAtTime(x, y, t) {
    if (game.tools.pointInSmoke(x, y)) return null;
    for (const guard of game.guards) {
      const g = guardAtTime(guard, t);
      const dx = x - g.x;
      const dy = y - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 38) return { kind: 'guard', guard };
      if (dist > GUARD_VIEW_RANGE + 40) continue;
      const targetAngle = Math.atan2(dy, dx);
      if (Math.abs(angleDifference(targetAngle, g.angle)) > 0.62 + 0.15) continue;
      if (!game.world.hasLineOfSight(g.x, g.y, x, y)) continue;
      return { kind: 'guard', guard };
    }
    for (const camera of game.cameras) {
      if (camera.disabled) continue;
      const dx = x - camera.x;
      const dy = y - camera.y;
      const dist = Math.hypot(dx, dy);
      if (dist > CAMERA_VIEW_RANGE + 30) continue;
      const targetAngle = Math.atan2(dy, dx);
      if (Math.abs(angleDifference(targetAngle, cameraAngleAtTime(camera, t))) > 0.55 + 0.12) continue;
      if (!game.world.hasLineOfSight(camera.x, camera.y, x, y)) continue;
      return { kind: 'camera', camera };
    }
    return null;
  }

  function isSafeAtTime(x, y, t) {
    return checkSafetyAtTime(x, y, t) === null;
  }

  // Apakah ruas lurus (fx,fy)-(tx,ty) bisa dilewati pencuri (radius 13)?
  // Dipakai supaya autopilot tidak mencoba memotong diagonal menembus
  // dinding saat mundur. Perluasan 10 piksel (bukan 13) supaya sudut
  // dinding yang pas-pasan tetap bisa dilewati dengan bergeser.
  function pathWalkable(fx, fy, tx, ty) {
    const r = 10;
    for (const w of game.world.walls) {
      const expanded = { x: w.x - r, y: w.y - r, w: w.w + r * 2, h: w.h + r * 2 };
      if (segmentHitsRect(fx, fy, tx, ty, expanded)) return false;
    }
    return true;
  }

  // Apakah lintasan dari (fx,fy) menuju (tx,ty) tetap aman selama horizon
  // detik ke depan? Pencuri disimulasikan bergerak dengan kecepatan `speed`
  // menuju target, dicek tiap 0,1 detik — jadi ramalan mengikuti gerak
  // pencuri, bukan menuntut satu titik diam aman. Horizon dipotong di
  // saat tiba (+0,3 detik): pencuri tidak berhenti di tujuan, ia langsung
  // lanjut ke titik jalan berikutnya. `grace` mengabaikan 0,25 detik pertama
  // (untuk mundur dari posisi yang sudah tidak aman: yang penting lintasannya
  // segera keluar dari bahaya).
  function trajectorySafe(fx, fy, tx, ty, horizon, speed, grace, timeOffset) {
    const offset = timeOffset || 0;
    const dx = tx - fx;
    const dy = ty - fy;
    const dist = Math.hypot(dx, dy);
    if (dist > 1 && !pathWalkable(fx, fy, tx, ty)) return false;
    const stepX = dist > 0 ? dx / dist : 0;
    const stepY = dist > 0 ? dy / dist : 0;
    const arrivalTime = dist / speed;
    const effectiveHorizon = Math.min(horizon, arrivalTime + 0.3);
    const startT = offset + (grace || 0);
    for (let t = startT; t <= offset + effectiveHorizon; t += 0.1) {
      const moved = Math.min(dist, speed * (t - offset));
      const px = fx + stepX * moved;
      const py = fy + stepY * moved;
      if (!isSafeAtTime(px, py, t)) return false;
    }
    return true;
  }

  // Jarak ke penjaga terdekat (untuk memutuskan boleh lari atau tidak:
  // lari berisik dan terdengar sampai 170 piksel).
  function nearestGuard() {
    let best = null;
    let bestDist = Infinity;
    for (const guard of game.guards) {
      const d = Math.hypot(guard.x - game.thief.x, guard.y - game.thief.y);
      if (d < bestDist) {
        bestDist = d;
        best = guard;
      }
    }
    return { guard: best, dist: bestDist };
  }

  function nearestGuardDistance() {
    return nearestGuard().dist;
  }

  // Penghalang pertama di lintasan (dipakai untuk memilih tool yang tepat:
  // koin untuk penjaga, EMP untuk kamera).
  function findBlocker(fx, fy, tx, ty, horizon, speed) {
    const dx = tx - fx;
    const dy = ty - fy;
    const dist = Math.hypot(dx, dy);
    const stepX = dist > 0 ? dx / dist : 0;
    const stepY = dist > 0 ? dy / dist : 0;
    const arrivalTime = dist / speed;
    const effectiveHorizon = Math.min(horizon, arrivalTime + 0.3);
    for (let t = 0; t <= effectiveHorizon; t += 0.1) {
      const moved = Math.min(dist, speed * t);
      const px = fx + stepX * moved;
      const py = fy + stepY * moved;
      const blocker = checkSafetyAtTime(px, py, t);
      if (blocker) return blocker;
    }
    return null;
  }

  // Titik lempar koin untuk memancing penjaga penghalang menjauh dari jalan
  // pencuri: 150 piksel ke samping (tegak lurus arah jalan), supaya ia
  // berjalan menjauhi garis yang mau dilewati pencuri.
  function coinLurePoint(target, blockerGuard) {
    const guard = blockerGuard;
    const pdx = target.x - game.thief.x;
    const pdy = target.y - game.thief.y;
    const plen = Math.hypot(pdx, pdy) || 1;
    const ux = pdx / plen;
    const uy = pdy / plen;
    const tries = [
      { x: guard.x - uy * 150, y: guard.y + ux * 150 },
      { x: guard.x + uy * 150, y: guard.y - ux * 150 },
      { x: guard.x - ux * 150, y: guard.y - uy * 150 },
    ];
    for (const p of tries) {
      if (!game.world.pointBlocked(p.x, p.y)) return p;
    }
    return tries[0];
  }

  function isSafePosition(x, y) {
    return isSafeAtTime(x, y, 0);
  }

  // Apakah target untuk indeks ini adalah tujuan akhir (loot / EXIT),
  // bukan titik jalan biasa?
  function targetIsFinal(index) {
    return index >= orderedPath().length;
  }

  // Urutan titik jalan untuk mode sekarang: berangkat pakai autopilotPath,
  // pulang pakai autopilotReturnPath kalau ruangan mendefinisikannya
  // (ruangan 3 pulang lewat bawah), kalau tidak kebalikan jalur berangkat.
  function orderedPath() {
    const def = game.world.def;
    if (state.mode === 'toLoot') return def.autopilotPath;
    if (def.autopilotReturnPath) return def.autopilotReturnPath;
    return [...def.autopilotPath].reverse();
  }

  // Titik jalan yang sedang dituju.
  function currentTarget() {
    return targetAt(state.waypointIndex);
  }

  // Target untuk indeks titik jalan tertentu (dipakai untuk memeriksa
  // ruas berikutnya: jangan maju ke titik jalan kalau ruas sesudahnya
  // sedang tertutup — pencuri akan terjebak menunggu di tempat yang
  // panas, lalu terpaksa mundur lagi).
  function targetAt(index) {
    const path = orderedPath();
    if (state.mode === 'toLoot') {
      if (index >= path.length) return { x: game.world.def.loot.x, y: game.world.def.loot.y };
      return { x: path[index][0], y: path[index][1] };
    }
    // Pulang: urutan jalur pulang, lalu ke EXIT.
    if (index < path.length) {
      return { x: path[index][0], y: path[index][1] };
    }
    const exit = game.world.def.exit;
    return { x: exit.x + exit.w / 2, y: exit.y + exit.h / 2 };
  }

  // Daftar titik jalan yang sudah dilewati (untuk mundur), dari yang
  // terdekat ke yang terjauh. Tiap kandidat membawa waypointIndex-nya
  // supaya sesudah mundur autopilot melanjutkan lewat titik jalan lagi,
  // bukan memotong diagonal melewati zona bahaya.
  function retreatCandidates() {
    const ordered = orderedPath();
    const candidates = [];
    for (let i = state.waypointIndex - 1; i >= 0; i--) {
      candidates.push({ x: ordered[i][0], y: ordered[i][1], waypointIndex: i });
    }
    candidates.push({ x: game.world.def.thiefStart.x, y: game.world.def.thiefStart.y, waypointIndex: 0 });
    return candidates;
  }

  // Titik jalan terdekat yang bisa dicapai lurus dari posisi pencuri
  // (dipakai kalau pencuri terlempar keluar jalur dan target langsungnya
  // terhalang dinding: kembali dulu ke jalur, baru lanjut).
  function nearestWalkableWaypoint() {
    const ordered = orderedPath();
    let best = null;
    let bestDist = Infinity;
    for (let i = 0; i < ordered.length; i++) {
      const p = { x: ordered[i][0], y: ordered[i][1] };
      const d = Math.hypot(p.x - game.thief.x, p.y - game.thief.y);
      if (d < bestDist && pathWalkable(game.thief.x, game.thief.y, p.x, p.y)) {
        bestDist = d;
        best = { x: p.x, y: p.y, waypointIndex: i };
      }
    }
    return best;
  }

  function moveToward(tx, ty) {
    const dx = tx - game.thief.x;
    const dy = ty - game.thief.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  // Ruas yang sedang ditempuh (commit): sekali pencuri berangkat karena
  // rantai ruas sudah diramal aman, ia menyelesaikan ruas itu tanpa
  // berhenti di tengah. Berhenti di tengah merusak ramalan waktu —
  // penjaga tiba di titik bahaya lebih dulu daripada pencuri.
  let legTarget = null;

  function update(dt) {
    if (state.result) return state.result;
    state.steps += 1;
    state.smokeCooldown = Math.max(0, state.smokeCooldown - dt);
    state.coinCooldown = Math.max(0, state.coinCooldown - dt);
    state.empCooldown = Math.max(0, state.empCooldown - dt);

    if (state.mode === 'toLoot' && game.world.lootTaken) {
      state.mode = 'toExit';
      state.waypointIndex = 0;
      state.waitTimer = 0;
      legTarget = null;
    }

    // Penjaga sedang mengejar: jangan diam di tempat. Pakai asap kalau ada
    // (pandangan terhalang, pengejar kehilangan jejak), lalu lari menjauhi
    // pengejar — pencuri lebih cepat daripada penjaga saat lari.
    const chaser = game.guards.find((g) => g.state === 'chase');
    if (chaser) {
      if (state.smokeCooldown <= 0 && game.coins >= 100) {
        game.useTool('smoke');
        state.smokeCooldown = 8;
      }
      const dx = game.thief.x - chaser.x;
      const dy = game.thief.y - chaser.y;
      const len = Math.hypot(dx, dy) || 1;
      return { x: dx / len, y: dy / len, sprint: true };
    }

    // Di dalam asap: terobos saja, asap menahan pandangan 5 detik.
    if (game.tools.pointInSmoke(game.thief.x, game.thief.y)) {
      const target = currentTarget();
      if (Math.hypot(target.x - game.thief.x, target.y - game.thief.y) < 16) {
        state.waypointIndex += 1;
        return { x: 0, y: 0 };
      }
      state.waitTimer = 0;
      return moveToward(target.x, target.y);
    }

    const target = currentTarget();
    const dx = target.x - game.thief.x;
    const dy = target.y - game.thief.y;
    const dist = Math.hypot(dx, dy);

    // Sedang menempuh ruas: lanjutkan tanpa memeriksa ulang — ramalan
    // rantai sudah memastikan ruas ini aman bila ditempuh tanpa berhenti.
    if (legTarget) {
      if (dist < 16) {
        legTarget = null;
        state.waypointIndex += 1;
        state.waitTimer = 0;
        return { x: 0, y: 0 };
      }
      state.waitTimer = 0;
      return moveToward(legTarget.x, legTarget.y);
    }

    if (dist < 16) {
      state.waypointIndex += 1;
      state.waitTimer = 0;
      return { x: 0, y: 0 };
    }

    // Jalan lurus ke target terhalang dinding (misalnya sesudah mundur
    // diagonal): kembali dulu ke titik jalan terdekat yang bisa dilewati.
    if (!pathWalkable(game.thief.x, game.thief.y, target.x, target.y)) {
      const recovery = nearestWalkableWaypoint();
      if (recovery) {
        state.waypointIndex = recovery.waypointIndex;
        state.waitTimer = 0;
        return moveToward(recovery.x, recovery.y);
      }
      return { x: 0, y: 0 };
    }

    // Posisi sekarang diramal tidak aman dalam 0,8 detik kalau diam saja:
    // mundur ke titik jalan sebelumnya yang lintasannya diramal aman,
    // sebelum alarm sempat naik. Horizon pendek (bukan 1,5 detik) supaya
    // pencuri tidak mundur karena ramalan yang masih jauh — ia sedang
    // menunggu di titik jalan aman dan alarm yang naik sesaat bisa turun
    // lagi sendiri.
    if (!trajectorySafe(game.thief.x, game.thief.y, game.thief.x, game.thief.y, 0.8, 175)) {
      let retreated = false;
      for (const horizon of [1.5, 0.6]) {
        for (const cand of retreatCandidates()) {
          if (Math.hypot(cand.x - game.thief.x, cand.y - game.thief.y) > 20
            && trajectorySafe(game.thief.x, game.thief.y, cand.x, cand.y, horizon, 175, 0.4)) {
            state.waypointIndex = cand.waypointIndex;
            state.waitTimer = 0;
            retreated = true;
            return moveToward(cand.x, cand.y);
          }
        }
        if (retreated) break;
      }
      // Tidak ada titik mundur yang aman: diam saja di tempat dan evaluasi
      // ulang frame berikutnya — penjaga bergerak, jadi titik mundur akan
      // segera aman lagi. Melangkah menjauhi ancaman tanpa arah justru
      // mendorong pencuri ke tempat yang lebih buruk (pernah lari ke
      // sudut dan dikejar sampai alarm 100). Sighting sesaat tidak fatal:
      // alarm turun lagi 9/detik begitu pencuri tidak terlihat.
      return { x: 0, y: 0 };
    }

    // Jalan kaki saja (tanpa lari): lari berisik dan memancing penjaga
    // mendatangi posisi pencuri — terlalu berisiko untuk playtest yang
    // harus menang. Kecepatan jalan sudah cukup untuk semua jendela waktu.
    const wantSprint = false;
    const speed = wantSprint ? 265 : 175;

    // Rantai ruas ke depan harus aman semuanya: pencuri hanya berangkat
    // dari tempatnya yang aman kalau dua ruas berikutnya bisa dilewati
    // tanpa terlihat. Satu ruas saja terlalu nekat (pencuri berlari ke
    // tempat panas lalu dikejar dua penjaga sekaligus). Rantai 2 ruas
    // memang menunggu lebih lama di (700,380), tapi aman — dan jalur
    // pulang ruangan 3 sudah dipisah supaya tidak macet di kamera kiri.
    let chainSafe = true;
    let chainOffset = 0;
    let chainFrom = { x: game.thief.x, y: game.thief.y };
    let chainIndex = state.waypointIndex;
    for (let leg = 0; leg < 2; leg++) {
      const legTo = targetAt(chainIndex);
      const legDist = Math.hypot(legTo.x - chainFrom.x, legTo.y - chainFrom.y);
      if (!trajectorySafe(chainFrom.x, chainFrom.y, legTo.x, legTo.y, 3.0, speed, 0, chainOffset)) {
        chainSafe = false;
        break;
      }
      chainOffset += legDist / speed;
      chainFrom = legTo;
      if (targetIsFinal(chainIndex)) break;
      chainIndex += 1;
    }
    if (!chainSafe) {
      state.waitTimer += dt;
      const blocker = findBlocker(game.thief.x, game.thief.y, target.x, target.y, 1.5, speed);
      state.blocker = blocker ? blocker.kind : null;
      // Tertahan karena penjaga menghalangi jalan: JANGAN lempar koin.
      // Koin menarik penjaga mendekati jalur pencuri, lalu ia kembali
      // lewat jalur itu juga — ramalan posisi penjaga jadi kacau dan
      // pencuri malah terpaksa mundur. Lebih aman menunggu saja sampai
      // penjaga lewat sendiri (patroli itu berkala dan bisa diramal).
      // Tertahan karena kamera menghalangi jalan: EMP matikan kamera 6 detik.
      // Dipakai SEGERA begitu kamera menghalangi — jangan tunggu sampai
      // alarm naik: kamera di dekat loot menutupi seluruh jalur pulang
      // juga, jadi mundur tanpa EMP pun tetap terlihat.
      if (blocker && blocker.kind === 'camera' && state.empCooldown <= 0
        && game.coins >= 150 && state.waitTimer > 0.5) {
        game.useTool('emp');
        state.empCooldown = 8;
        state.waitTimer = 0;
      }
      // Tertahan lama dan masih ada koin: pakai asap lalu terobos.
      // Kalau alarm sudah naik, jangan tunggu lama — asap segera memutus
      // pandangan supaya alarm tidak sempat mencapai 55 (penjaga mengejar).
      if ((state.waitTimer > 6 || game.alarm > 25) && state.smokeCooldown <= 0 && game.coins >= 100
        && (game.coins > 150 || game.alarm > 40)) {
        game.useTool('smoke');
        state.smokeCooldown = 8;
        state.waitTimer = 0;
      }
      return { x: 0, y: 0 };
    }
    state.blocker = null;

    state.waitTimer = 0;
    // Alarm sudah tinggi: jangan lari, jalan pelan supaya tidak berisik.
    const sprint = wantSprint;
    // Berangkat: kunci ruas ini sampai tiba (lihat legTarget di atas).
    legTarget = { x: target.x, y: target.y };
    return { x: dx / dist, y: dy / dist, sprint };
  }

  // Dipanggil saat ruangan baru dimuat: mulai lagi dari titik jalan pertama.
  function reset() {
    state.mode = 'toLoot';
    state.waypointIndex = 0;
    state.waitTimer = 0;
    state.smokeCooldown = 0;
    state.coinCooldown = 0;
    legTarget = null;
  }

  return { state, update, isSafePosition, reset };
}
