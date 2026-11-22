// audio.js — semua suara disintesis WebAudio, tanpa file suara.
// Nada sederhana: langkah kaki, denting koin, zap EMP, desis asap,
// bunyi ambil loot, alarm, dan sting saat ketahuan.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let alarmOsc = null;
  let alarmGain = null;
  let droneOsc = null;

  function ensureContext() {
    if (ctx) return ctx;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      ctx = new AudioContextClass();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, duration, type, volume, slideTo) {
    const c = ensureContext();
    if (!c || muted) return;
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), c.currentTime + duration);
      gain.gain.setValueAtTime(volume || 0.15, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(c.currentTime + duration + 0.02);
    } catch {
      // Suara gagal tidak boleh merusak game.
    }
  }

  function noiseBurst(duration, volume, lowpassFreq) {
    const c = ensureContext();
    if (!c || muted) return;
    try {
      const len = Math.floor(c.sampleRate * duration);
      const buffer = c.createBuffer(1, len, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const source = c.createBufferSource();
      source.buffer = buffer;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpassFreq || 1200;
      const gain = c.createGain();
      gain.gain.value = volume || 0.2;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
    } catch {
      // Abaikan.
    }
  }

  return {
    // Dipanggil dari gestur pemain (klik / tombol) supaya AudioContext boleh jalan.
    unlock() {
      const c = ensureContext();
      if (c && c.state === 'suspended') c.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() {
      return muted;
    },
    playStep() {
      noiseBurst(0.05, 0.05, 500);
    },
    playCoinClink() {
      tone(1900, 0.12, 'triangle', 0.16);
      setTimeout(() => tone(2500, 0.16, 'triangle', 0.12), 70);
    },
    playEmpZap() {
      tone(1400, 0.35, 'sawtooth', 0.14, 120);
      noiseBurst(0.25, 0.12, 3000);
    },
    playSmokeHiss() {
      noiseBurst(0.6, 0.18, 900);
    },
    playPickup() {
      tone(660, 0.12, 'sine', 0.18);
      setTimeout(() => tone(880, 0.14, 'sine', 0.18), 90);
      setTimeout(() => tone(1320, 0.22, 'sine', 0.16), 180);
    },
    playLootFanfare() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((n, i) => setTimeout(() => tone(n, 0.3, 'triangle', 0.18), i * 110));
    },
    playCaughtSting() {
      tone(220, 0.7, 'sawtooth', 0.2, 55);
      tone(233, 0.7, 'sawtooth', 0.2, 58);
    },
    playWinJingle() {
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((n, i) => setTimeout(() => tone(n, 0.35, 'triangle', 0.18), i * 130));
    },
    playClick() {
      tone(900, 0.06, 'square', 0.08);
    },
    // Alarm berbunyi terus selama alarm tinggi; panggil tiap frame dengan level 0..100.
    setAlarmLevel(level) {
      const c = ensureContext();
      if (!c || muted) {
        if (alarmGain) alarmGain.gain.value = 0;
        return;
      }
      try {
        if (!alarmOsc) {
          alarmOsc = c.createOscillator();
          alarmOsc.type = 'sine';
          alarmOsc.frequency.value = 620;
          alarmGain = c.createGain();
          alarmGain.gain.value = 0;
          const lfo = c.createOscillator();
          lfo.frequency.value = 5;
          const lfoGain = c.createGain();
          lfoGain.gain.value = 180;
          lfo.connect(lfoGain);
          lfoGain.connect(alarmOsc.frequency);
          alarmOsc.connect(alarmGain);
          alarmGain.connect(master);
          alarmOsc.start();
          lfo.start();
        }
        const target = level > 25 ? Math.min(0.12, (level - 25) / 100) : 0;
        alarmGain.gain.setTargetAtTime(target, c.currentTime, 0.15);
      } catch {
        // Abaikan.
      }
    },
    // Dengung ruangan pelan saat bermain.
    startDrone() {
      const c = ensureContext();
      if (!c || droneOsc) return;
      try {
        droneOsc = c.createOscillator();
        droneOsc.type = 'sine';
        droneOsc.frequency.value = 55;
        const gain = c.createGain();
        gain.gain.value = 0.035;
        droneOsc.connect(gain);
        gain.connect(master);
        droneOsc.start();
      } catch {
        // Abaikan.
      }
    },
  };
}
