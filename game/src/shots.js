// shots.js — keadaan deterministik untuk 4 screenshot (?shot=start|play|chase|end&seed=1).
// Tiap shot menata satu frame lengkap: ruangan, penjaga + cone, kamera, loot,
// alarm meter, dan HUD — supaya screenshot bisa diulang persis.

export function applyShotState(game, shot) {
  const levelIndex = shot === 'start' ? 0 : shot === 'play' ? 1 : 2;
  game.loadLevel(levelIndex);
  game.phase = 'playing';
  game.time = 1.2; // waktu tetap: cone kamera dan denyut loot selalu sama
  game.elapsed = 0;

  if (shot === 'start') {
    // Cover: ruangan 1, pencuri di kiri bawah, penjaga di tengah, loot emas di kanan atas.
    game.thief.x = 300;
    game.thief.y = 560;
    game.guards[0].x = 620;
    game.guards[0].y = 300;
    game.guards[0].angle = Math.PI; // menghadap kiri, cone menyapu pencuri
    game.guards[1].x = 640;
    game.guards[1].y = 380;
    game.guards[1].angle = -Math.PI / 2; // menghadap atas
    game.cameras[0].time = 0.9; // cone kamera mengarah ke kanan bawah
    game.alarm = 12;
    game.score = 0;
    game.coins = 800;
    game.elapsed = 47;
    game.phase = 'title';
  } else if (shot === 'play') {
    // Tengah permainan di ruangan 2: pencuri menyelinap di balik etalase bawah.
    game.thief.x = 700;
    game.thief.y = 600;
    game.guards[0].x = 500;
    game.guards[0].y = 200;
    game.guards[0].angle = 0;
    game.guards[1].x = 800;
    game.guards[1].y = 430;
    game.guards[1].angle = Math.PI;
    game.guards[2].x = 640;
    game.guards[2].y = 420;
    game.guards[2].angle = Math.PI / 2;
    game.cameras[0].time = 1.6;
    game.cameras[1].time = 0.4;
    game.alarm = 34;
    game.score = 280;
    game.coins = 370;
    game.elapsed = 96;
    game.tools.coinsThrown.push({ x: 850, y: 430, timer: 2.8 });
    game.message = 'Koin dilempar — penjaga mendatangi bunyi!';
  } else if (shot === 'chase') {
    // Alarm tinggi di ruangan 3: penjaga mengejar, bingkai merah menyala.
    game.thief.x = 560;
    game.thief.y = 560;
    game.guards[0].x = 700;
    game.guards[0].y = 300;
    game.guards[0].angle = Math.PI * 0.75;
    game.guards[1].x = 640;
    game.guards[1].y = 560;
    game.guards[1].angle = Math.PI;
    game.guards[1].state = 'chase';
    game.guards[1].lastSeenTimer = 3;
    game.anyChasing = true;
    game.guards[2].x = 300;
    game.guards[2].y = 420;
    game.guards[2].angle = 0;
    game.guards[3].x = 980;
    game.guards[3].y = 420;
    game.guards[3].angle = Math.PI;
    game.cameras[0].time = 2.2;
    game.cameras[1].time = 0.8;
    game.cameras[2].time = 1.9;
    game.alarm = 78;
    game.score = 640;
    game.coins = 220;
    game.elapsed = 154;
    game.message = 'TERKEJAR! Sembunyi sampai alarm turun!';
  } else if (shot === 'end') {
    // Menang: pencuri di EXIT dengan semua artefak, layar kemenangan.
    game.thief.x = 82;
    game.thief.y = 668;
    game.world.lootTaken = true;
    game.guards[0].x = 500;
    game.guards[0].y = 180;
    game.guards[0].angle = 0;
    game.guards[1].x = 700;
    game.guards[1].y = 560;
    game.guards[1].angle = Math.PI;
    game.guards[2].x = 300;
    game.guards[2].y = 300;
    game.guards[2].angle = Math.PI / 2;
    game.guards[3].x = 980;
    game.guards[3].y = 300;
    game.guards[3].angle = -Math.PI / 2;
    game.cameras[0].time = 1.1;
    game.cameras[1].time = 2.4;
    game.cameras[2].time = 0.2;
    game.alarm = 18;
    game.score = 12450;
    game.coins = 430;
    game.elapsed = 167;
    game.winTimeText = '02:47';
    game.peakAlarm = 41;
    game.phase = 'win';
  }
}
