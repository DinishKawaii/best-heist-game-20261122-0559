// input.js — keyboard + mouse. Satu tempat yang tahu tombol apa ditekan,
// supaya main.js dan autopilot.js tidak membaca event mentah sendiri.

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set(); // tombol yang baru ditekan sejak frame terakhir dibaca
  let mouseX = 0;
  let mouseY = 0;
  let mouseClicked = false;
  let mouseClickX = 0;
  let mouseClickY = 0;

  function keyName(event) {
    const k = event.key;
    if (k === ' ') return 'Space';
    if (k.length === 1) return k.toLowerCase();
    return k;
  }

  window.addEventListener('keydown', (event) => {
    const name = keyName(event);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!keys.has(name)) pressed.add(name);
    keys.add(name);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(keyName(event));
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseClickX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouseClickY = ((event.clientY - rect.top) / rect.height) * canvas.height;
    mouseClicked = true;
  });

  return {
    // Arah gerak dari WASD / panah, dinormalkan.
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) x += 1;
      if (keys.has('w') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('s') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const len = Math.hypot(x, y);
        x /= len;
        y /= len;
      }
      return { x, y };
    },
    isSprinting() {
      return keys.has('Shift');
    },
    wasPressed(name) {
      return pressed.has(name);
    },
    // Konsumsi semua "baru ditekan" setelah satu frame dibaca.
    endFrame() {
      pressed.clear();
      mouseClicked = false;
    },
    mousePosition() {
      return { x: mouseX, y: mouseY };
    },
    takeMouseClick() {
      if (!mouseClicked) return null;
      mouseClicked = false;
      return { x: mouseClickX, y: mouseClickY };
    },
    // Dipakai autopilot dan tes: menekan tombol dari kode, bukan keyboard.
    pressKey(name) {
      if (!keys.has(name)) pressed.add(name);
      keys.add(name);
    },
    releaseKey(name) {
      keys.delete(name);
    },
  };
}
