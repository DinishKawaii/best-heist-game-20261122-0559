// cameras.js — kamera keamanan: menempel di dinding, conenya berputar
// bolak-balik, dan mati sementara saat kena EMP.

import { CAMERA_VIEW_RANGE, CAMERA_VIEW_HALF_ANGLE } from './config.js';

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createCamera(def, index) {
  return {
    index,
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    speed: def.speed,
    phase: def.phase || 0,
    time: 0,
    disabledTimer: 0, // >0 berarti kamera mati karena EMP

    get angle() {
      return this.baseAngle + Math.sin(this.time * this.speed + this.phase) * this.sweep;
    },

    update(dt) {
      this.time += dt;
      if (this.disabledTimer > 0) this.disabledTimer -= dt;
    },

    disable(seconds) {
      this.disabledTimer = Math.max(this.disabledTimer, seconds);
    },

    get disabled() {
      return this.disabledTimer > 0;
    },

    // Apakah kamera ini melihat titik (tx,ty)?
    canSeePoint(tx, ty, world) {
      if (this.disabled) return { sees: false, dist: Infinity };
      const dx = tx - this.x;
      const dy = ty - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > CAMERA_VIEW_RANGE) return { sees: false, dist };
      const targetAngle = Math.atan2(dy, dx);
      if (Math.abs(angleDifference(targetAngle, this.angle)) > CAMERA_VIEW_HALF_ANGLE) {
        return { sees: false, dist };
      }
      if (!world.hasLineOfSight(this.x, this.y, tx, ty)) return { sees: false, dist };
      return { sees: true, dist };
    },
  };
}

export function createCameras(defs) {
  return defs.map((def, i) => createCamera(def, i));
}
