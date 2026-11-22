// config.js — semua angka dan isi tiga ruangan game "Midnight at the Garuda Vault".
// Satu-satunya tempat yang mendefinisikan level: dinding, penjaga, kamera, loot, dan jalan
// aman yang dipakai autopilot. Tidak ada yang diimpor dari file lain di sini.

export const GAME_TITLE = 'Midnight at the Garuda Vault';
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export const HUD_HEIGHT = 76;
export const PLAY_TOP = HUD_HEIGHT;
export const PLAY_BOTTOM = VIEW_HEIGHT;
export const PLAY_LEFT = 0;
export const PLAY_RIGHT = VIEW_WIDTH;

// Kecepatan (piksel per detik) dan aturan alarm.
export const THIEF_SPEED = 175;
export const THIEF_SPRINT_SPEED = 265;
export const GUARD_PATROL_SPEED = 82;
export const GUARD_CHASE_SPEED = 158;
export const GUARD_VIEW_RANGE = 225;
export const GUARD_VIEW_HALF_ANGLE = 0.62; // radian, sekitar 35 derajat ke tiap sisi
export const CAMERA_VIEW_RANGE = 240;
export const CAMERA_VIEW_HALF_ANGLE = 0.55;
export const ALARM_RISE_CLOSE = 34; // per detik saat pencuri terlihat dari dekat
export const ALARM_RISE_FAR = 13; // per detik saat terlihat dari jauh
export const ALARM_DECAY = 9; // per detik saat tidak terlihat
export const ALARM_CHASE_AT = 55; // penjaga mulai mengejar di atas angka ini
export const ALARM_CAUGHT_AT = 100;
export const CATCH_DISTANCE = 26; // penjaga menyentuh pencuri = ketahuan

// Uang awal dan harga tools. Semua tool dibayar dari dompet pencuri.
export const START_COINS = 800; // Dompet awal: cukup untuk EMP + asap di tiap ruangan.
export const TOOL_COIN_COST = 50;
export const TOOL_EMP_COST = 150;
export const TOOL_SMOKE_COST = 100;
export const EMP_DURATION = 6; // detik kamera mati
export const SMOKE_DURATION = 5; // detik asap menahan pandangan
export const COIN_NOISE_RADIUS = 190; // penjaga dalam radius ini mendatangi koin

// Loot kecil yang tersebar di tiap ruangan (nama, nilai, posisi).
export function makeSmallLoot() {
  return [
    { kind: 'coin', x: 350, y: 560, value: 40, taken: false },
    { kind: 'coin', x: 905, y: 560, value: 40, taken: false },
    { kind: 'gem', x: 205, y: 150, value: 120, taken: false },
  ];
}

// Tiga ruangan. Koordinat dalam piksel, area main y = 76..720.
// walls: penghalang gerak dan pandangan. cases: etalase (juga penghalang, digambar beda).
// guards: { waypoints: [[x,y],...], speed }. cameras: { x, y, baseAngle, sweep, speed, phase }.
// loot: artefak utama ruangan. exit: pintu keluar. thiefStart: posisi awal pencuri.
// autopilotPath: titik-titik jalan aman yang dipakai mode autopilot (dan jalan pulang
// dihitung dengan membalik urutannya).
export const LEVELS = [
  {
    name: 'RUANGAN 1',
    roomName: 'Galeri Malam',
    lootName: 'Garuda Emas',
    lootValue: 1000,
    loot: { x: 1050, y: 150 },
    exit: { x: 36, y: 636, w: 92, h: 66 },
    thiefStart: { x: 128, y: 664 },
    walls: [
      { x: 300, y: 220, w: 180, h: 58 },
      { x: 700, y: 220, w: 180, h: 58 },
      { x: 560, y: 420, w: 60, h: 60 },
      { x: 180, y: 480, w: 160, h: 58 },
      { x: 940, y: 480, w: 160, h: 58 },
    ],
    cases: [
      { x: 330, y: 236, w: 120, h: 26 },
      { x: 730, y: 236, w: 120, h: 26 },
      { x: 210, y: 496, w: 100, h: 26 },
      { x: 970, y: 496, w: 100, h: 26 },
    ],
    carpets: [{ x: 120, y: 130, w: 1040, h: 44 }],
    guards: [
      { waypoints: [[250, 300], [1000, 300]], speed: 82 },
      { waypoints: [[640, 180], [640, 600]], speed: 72 },
    ],
    cameras: [
      { x: 640, y: 92, baseAngle: Math.PI / 2, sweep: 0.8, speed: 0.5, phase: 0 },
    ],
    smallLoot: [
      { kind: 'coin', x: 350, y: 560, value: 40, taken: false },
      { kind: 'coin', x: 905, y: 560, value: 40, taken: false },
      { kind: 'gem', x: 205, y: 150, value: 120, taken: false },
    ],
    autopilotPath: [
      [128, 560], [500, 640], [900, 640], [1150, 640], [1150, 400],
      [1150, 250], [1150, 150], [1050, 150],
    ],
  },
  {
    name: 'RUANGAN 2',
    roomName: 'Koridor Brankas',
    lootName: 'Mahkota Nusantara',
    lootValue: 1200,
    loot: { x: 1150, y: 140 },
    exit: { x: 36, y: 636, w: 92, h: 66 },
    thiefStart: { x: 128, y: 664 },
    walls: [
      { x: 0, y: 300, w: 500, h: 36 },
      { x: 780, y: 300, w: 500, h: 36 },
      { x: 0, y: 520, w: 420, h: 36 },
      { x: 860, y: 520, w: 420, h: 36 },
      { x: 560, y: 150, w: 160, h: 50 },
      { x: 560, y: 600, w: 160, h: 50 },
    ],
    cases: [
      { x: 590, y: 164, w: 100, h: 24 },
      { x: 590, y: 614, w: 100, h: 24 },
    ],
    carpets: [{ x: 520, y: 336, w: 240, h: 184 }],
    guards: [
      { waypoints: [[200, 240], [1100, 240]], speed: 88 },
      { waypoints: [[1100, 430], [200, 430]], speed: 80 },
      // Jalur x=600 (bukan 750): diagonal pencuri (700,380)->(860,150)
      // tidak lagi memotong garis patroli penjaga ini, dan titik tunggu
      // (700,580) jadi aman dari cone-nya. Jangkauan y 230..560 supaya
      // tidak menabrak etalase atas (y 150..200) dan bawah (y 600..650).
      { waypoints: [[600, 230], [600, 560]], speed: 76 },
    ],
    cameras: [
      { x: 300, y: 92, baseAngle: Math.PI / 2, sweep: 0.9, speed: 0.6, phase: 0 },
      { x: 980, y: 92, baseAngle: Math.PI / 2, sweep: 0.9, speed: 0.6, phase: 2.1 },
    ],
    smallLoot: [
      { kind: 'coin', x: 250, y: 620, value: 40, taken: false },
      { kind: 'coin', x: 1030, y: 620, value: 40, taken: false },
      { kind: 'gem', x: 1150, y: 430, value: 120, taken: false },
    ],
    autopilotPath: [
      [128, 600], [300, 600], [480, 580], [700, 580], [700, 380],
      [860, 150], [1150, 140],
    ],
  },
  {
    name: 'RUANGAN 3',
    roomName: 'Ruang Brankas Utama',
    lootName: 'Keris Pusaka',
    lootValue: 1500,
    loot: { x: 640, y: 350 },
    exit: { x: 36, y: 636, w: 92, h: 66 },
    thiefStart: { x: 128, y: 664 },
    walls: [
      // Brankas tengah: bentuk U, terbuka di bawah (pintu masuk brankas).
      { x: 480, y: 260, w: 36, h: 240 },
      { x: 764, y: 260, w: 36, h: 240 },
      { x: 480, y: 260, w: 320, h: 36 },
      { x: 180, y: 150, w: 150, h: 54 },
      { x: 950, y: 150, w: 150, h: 54 },
      { x: 180, y: 560, w: 150, h: 54 },
      { x: 950, y: 560, w: 150, h: 54 },
    ],
    cases: [
      { x: 205, y: 164, w: 100, h: 26 },
      { x: 975, y: 164, w: 100, h: 26 },
      { x: 205, y: 574, w: 100, h: 26 },
      { x: 975, y: 574, w: 100, h: 26 },
    ],
    carpets: [{ x: 560, y: 500, w: 160, h: 160 }],
    guards: [
      { waypoints: [[200, 240], [1080, 240]], speed: 92 },
      { waypoints: [[420, 560], [860, 560]], speed: 84 },
      { waypoints: [[360, 150], [360, 650]], speed: 78 },
      { waypoints: [[920, 150], [920, 650]], speed: 78 },
    ],
    cameras: [
      { x: 640, y: 92, baseAngle: Math.PI / 2, sweep: 1.0, speed: 0.65, phase: 0 },
      { x: 92, y: 400, baseAngle: 0, sweep: 0.85, speed: 0.55, phase: 1.4 },
      { x: 1188, y: 400, baseAngle: Math.PI, sweep: 0.85, speed: 0.55, phase: 2.8 },
    ],
    smallLoot: [
      { kind: 'coin', x: 420, y: 640, value: 40, taken: false },
      { kind: 'coin', x: 860, y: 640, value: 40, taken: false },
      { kind: 'gem', x: 640, y: 620, value: 120, taken: false },
    ],
    autopilotPath: [
      [128, 560], [128, 420], [128, 240], [200, 300], [420, 300],
      [420, 620], [560, 620], [640, 620], [640, 430], [640, 350],
    ],
    // Jalur pulang terpisah (bukan kebalikan jalur berangkat): dari
    // brankas langsung menyusuri bawah ke EXIT, supaya pencuri tidak
    // harus menunggu di (200,300) — titik itu disapu kamera kiri (92,400)
    // dan rantai 2 ruas ke (128,420) hampir tidak pernah bersih.
    autopilotReturnPath: [
      [640, 430], [640, 620], [560, 620], [420, 620], [128, 620],
    ],
  },
];
