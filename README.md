# Midnight at the Garuda Vault

[![best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/DinishKawaii/best-heist-game-20261122-0559/rank.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/DinishKawaii/best-heist-game-20261122-0559/reward.svg)](https://make.fun/c/best-heist-game-20261122-0559)

Game heist top-down 2D orisinil: satu pencuri menyelinap di museum pada tengah
malam, melewati tiga ruangan — Galeri Malam, Koridor Brankas, dan Ruang Brankas
Utama — untuk mengambil tiga artefak (Garuda Emas, Mahkota Nusantara, Keris
Pusaka) lalu kabur lewat pintu EXIT hijau.

## Cara main

- **Gerak:** WASD / tombol panah. **Lari:** tahan Shift (berisik — penjaga
  dekat akan mendatangi suaramu).
- **Tool berbayar** (dibeli dengan koin, dompet awal 520):
  - `1` **Koin** ($50) — klik di arena untuk melempar koin; penjaga di sekitar
    mendatangi bunyi dentingnya.
  - `2` **EMP** ($150) — matikan semua kamera selama 6 detik.
  - `3` **Asap** ($100) — awan asap 5 detik di posisimu; pandangan terhalang.
  - Klik kotak tool di HUD juga memakai tool itu.
- **Alarm 0–100:** naik saat penjaga atau kamera melihatmu, turun saat kamu
  sembunyi. Alarm 100 = lockdown = ketahuan. Alarm di atas 55 membuat
  penjaga mengejarmu. Disentuh penjaga = langsung ketahuan.
- **Menang:** ambil artefak ruangan, lalu capai EXIT hijau. Selesaikan tiga
  ruangan untuk menyelesaikan heist.
- **Lainnya:** `R` coba lagi, `M` matikan suara, `Enter` mulai.

Semua seni digambar dari kode (canvas) dan semua suara disintesis WebAudio —
tidak ada file gambar, suara, atau network request. Game jalan dari file
statis di desktop Chrome.

## Menjalankan

```sh
node serve.ts
# buka http://localhost:8080
```

Screenshot deterministik (seed tetap):

```sh
# ?shot=start | play | chase | end, masing-masing &seed=1
http://localhost:8080/?shot=start&seed=1
```

Playtest otomatis (autopilot deterministik, hasilnya tertulis di elemen
`#result` dan `document.title`):

```sh
http://localhost:8080/?mode=autopilot&seed=1
```

## Layout repo

| File | Tugas |
| --- | --- |
| `main.ts` | Program penyerahan: pre-flight check, salin `game/` + `screenshots/` ke `/output`, tulis `dossier.json` |
| `serve.ts` | Server statis kecil untuk `game/` di localhost:8080 |
| `vendor/makefun-game.ts` | Library dossier dari kit (tidak diubah) |
| `game/index.html` | Halaman game (canvas 1280x720) |
| `game/src/config.js` | Angka game + isi tiga ruangan (dinding, penjaga, kamera, loot) |
| `game/src/random.js` | Angka acak ber-seed untuk keadaan yang bisa diulang |
| `game/src/input.js` | Keyboard + mouse |
| `game/src/world.js` | Ruangan: tabrakan dinding dan garis pandang |
| `game/src/guards.js` | Penjaga patroli, vision cone, curiga, dan mengejar |
| `game/src/cameras.js` | Kamera keamanan berputar + mati saat kena EMP |
| `game/src/tools.js` | Koin, EMP, dan asap — semua berbayar |
| `game/src/audio.js` | Suara WebAudio: langkah, koin, EMP, asap, loot, alarm |
| `game/src/render.js` | Semua gambar: lantai, cone, pencuri, loot, HUD, layar judul |
| `game/src/shots.js` | Keadaan deterministik untuk 4 screenshot |
| `game/src/autopilot.js` | Pemain otomatis untuk playtest |
| `game/src/main.js` | Loop game, alarm meter, loot, dan status menang/kalah |
| `shots.json` | Daftar 4 screenshot dan query-nya |
| `screenshots/` | 4 PNG render asli dari kode game |
