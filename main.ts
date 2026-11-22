// main.ts — program penyerahan entri "Midnight at the Garuda Vault" (Node 22, stdlib saja).
//
// Tugasnya: menyalin game/ dan screenshots/ dari samping file ini ke /output
// (atau MAKEFUN_OUTPUT_DIR di luar grader) lalu menulis /output/dossier.json
// dengan buildDossier dari vendor/makefun-game.ts.
//
// Sebelum menyalin, program ini memeriksa dulu (pre-flight check) supaya entri
// yang gagal di tangan grader tidak pernah terkirim diam-diam:
//   - game/index.html ada dan tidak lebih dari 1 MiB
//   - screenshots/ berisi 3 atau 4 gambar PNG/JPEG, masing-masing <= 256 KiB
//   - tidak ada symlink di dalam game/ maupun screenshots/
// Kalau satu saja tidak lolos, program berhenti dengan pesan error yang jelas.
//
// Direktori output tidak pernah dihapus keseluruhannya: isinya dibersihkan
// file-per-file supaya program tetap aman dipanggil dua kali berturut-turut
// dan hasil kedua run byte-identik.

import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

const MAX_INDEX_BYTES = 1024 * 1024;
const MAX_SHOT_BYTES = 256 * 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

function fail(message) {
  throw new Error(`main.ts pre-flight: ${message}`);
}

function isPngOrJpeg(buffer) {
  return buffer.subarray(0, 8).equals(PNG_MAGIC) || buffer.subarray(0, 3).equals(JPEG_MAGIC);
}

// Periksa satu pohon direktori: hanya file dan direktori biasa, tanpa symlink.
function checkTreePlain(dir, label) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const info = lstatSync(path);
    if (info.isSymbolicLink()) fail(`${label}/${name} adalah symlink`);
    if (info.isDirectory()) checkTreePlain(path, `${label}/${name}`);
    else if (!info.isFile()) fail(`${label}/${name} bukan file biasa`);
  }
}

function checkGame() {
  const indexPath = join(gameDir, 'index.html');
  if (!existsSync(indexPath)) fail('game/index.html tidak ditemukan');
  const size = statSync(indexPath).size;
  if (size > MAX_INDEX_BYTES) fail(`game/index.html ${size} byte, melebihi 1 MiB`);
  checkTreePlain(gameDir, 'game');
}

function checkScreenshots() {
  if (!existsSync(shotsDir)) fail('screenshots/ tidak ditemukan');
  const names = readdirSync(shotsDir)
    .filter((name) => !name.startsWith('.'))
    .sort();
  if (names.length < 3 || names.length > 4) {
    fail(`screenshots/ berisi ${names.length} file, harus 3 atau 4`);
  }
  for (const name of names) {
    if (!/^[A-Za-z0-9._-]+$/.test(name) || name.startsWith('-')) {
      fail(`nama screenshot tidak valid: ${name}`);
    }
    const path = join(shotsDir, name);
    if (lstatSync(path).isSymbolicLink()) fail(`screenshots/${name} adalah symlink`);
    const buffer = readFileSync(path);
    if (buffer.length > MAX_SHOT_BYTES) {
      fail(`screenshots/${name} ${buffer.length} byte, melebihi 256 KiB`);
    }
    if (!isPngOrJpeg(buffer)) fail(`screenshots/${name} bukan PNG atau JPEG utuh`);
  }
  return names;
}

// Bersihkan isi direktori output file-per-file (direktorinya sendiri dibiarkan).
function cleanOutputDir(dir) {
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

function copyTreePlain(source, target) {
  mkdirSync(target, { recursive: true });
  for (const name of readdirSync(source)) {
    const from = join(source, name);
    const to = join(target, name);
    const info = lstatSync(from);
    if (info.isDirectory()) copyTreePlain(from, to);
    else copyFileSync(from, to);
  }
}

checkGame();
const shotNames = checkScreenshots();
cleanOutputDir(outDir);
copyTreePlain(gameDir, join(outDir, 'game'));
copyTreePlain(shotsDir, join(outDir, 'screenshots'));

writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(
  `dossier ditulis: game/ + ${shotNames.length} screenshot (${shotNames.join(', ')}) -> ${outDir}`,
);
