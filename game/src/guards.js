// guards.js — penjaga patroli: berjalan bolak-balik di jalurnya, melihat
// lewat vision cone, curiga saat mendengar suara, dan mengejar saat alarm tinggi.

import {
  GUARD_PATROL_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_VIEW_RANGE,
  GUARD_VIEW_HALF_ANGLE,
  CATCH_DISTANCE,
  ALARM_CHASE_AT,
} from './config.js';

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createGuard(def, index) {
  const waypoints = def.waypoints.map(([x, y]) => ({ x, y }));
  return {
    index,
    waypoints,
    x: waypoints[0].x,
    y: waypoints[0].y,
    angle: 0,
    speed: def.speed || GUARD_PATROL_SPEED,
    waypointIndex: 1,
    state: 'patrol', // patrol | investigate | chase | return
    investigateX: 0,
    investigateY: 0,
    investigateTimer: 0,
    lastSeenX: 0,
    lastSeenY: 0,
    lastSeenTimer: 0,
    stuckTimer: 0,

    // Apakah penjaga ini bisa melihat titik (tx,ty) dari posisinya sekarang?
    canSeePoint(tx, ty, world) {
      const dx = tx - this.x;
      const dy = ty - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > GUARD_VIEW_RANGE) return { sees: false, dist };
      const targetAngle = Math.atan2(dy, dx);
      if (Math.abs(angleDifference(targetAngle, this.angle)) > GUARD_VIEW_HALF_ANGLE) {
        return { sees: false, dist };
      }
      if (!world.hasLineOfSight(this.x, this.y, tx, ty)) return { sees: false, dist };
      return { sees: true, dist };
    },

    // Panggil saat penjaga mendengar suara di (x,y): datangi sumber suara.
    hearNoise(x, y) {
      if (this.state === 'chase') return;
      this.state = 'investigate';
      this.investigateX = x;
      this.investigateY = y;
      this.investigateTimer = 4;
    },

    update(dt, world, thief, alarm) {
      // Arah pandang mengikuti arah gerak saat patroli; saat mengejar, menatap pencuri.
      let targetX = this.x;
      let targetY = this.y;
      let speed = this.speed;

      if (this.state === 'patrol') {
        const wp = waypoints[this.waypointIndex];
        targetX = wp.x;
        targetY = wp.y;
        const dx = wp.x - this.x;
        const dy = wp.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 4) {
          this.waypointIndex = (this.waypointIndex + 1) % waypoints.length;
        }
      } else if (this.state === 'investigate') {
        targetX = this.investigateX;
        targetY = this.investigateY;
        speed = this.speed * 1.25;
        this.investigateTimer -= dt;
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        if (Math.hypot(dx, dy) < 14 || this.investigateTimer <= 0) {
          this.state = 'return';
        }
      } else if (this.state === 'chase') {
        targetX = thief.x;
        targetY = thief.y;
        speed = GUARD_CHASE_SPEED;
        this.lastSeenTimer -= dt;
        if (this.lastSeenTimer <= 0 && alarm < ALARM_CHASE_AT) {
          this.state = 'return';
        }
      } else if (this.state === 'return') {
        // Kembali ke titik patroli terdekat, lalu lanjut patroli.
        let best = waypoints[0];
        let bestDist = Infinity;
        for (const wp of waypoints) {
          const d = Math.hypot(wp.x - this.x, wp.y - this.y);
          if (d < bestDist) {
            bestDist = d;
            best = wp;
          }
        }
        targetX = best.x;
        targetY = best.y;
        if (bestDist < 6) {
          this.waypointIndex = waypoints.indexOf(best) + 1;
          if (this.waypointIndex >= waypoints.length) this.waypointIndex = 0;
          this.state = 'patrol';
        }
      }

      // Alarm tinggi + penjaga sempat melihat pencuri = kejar.
      if (alarm >= ALARM_CHASE_AT && this.lastSeenTimer > 0) {
        this.state = 'chase';
      }

      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.5) {
        const step = Math.min(dist, speed * dt);
        // Geser di sepanjang dinding (coba penuh, lalu sumbu-x, lalu sumbu-y)
        // supaya penjaga tidak pernah terjepit diam di sudut dinding —
        // penjaga yang macet merusak ramalan autopilot dan menutupi jalur.
        const moved = world.slideMove(this.x, this.y, 14, (dx / dist) * step, (dy / dist) * step);
        this.stuckTimer = (moved.x === this.x && moved.y === this.y) ? this.stuckTimer + dt : 0;
        this.x = moved.x;
        this.y = moved.y;
        this.angle = Math.atan2(dy, dx);
      }
      if (this.state === 'chase') {
        this.angle = Math.atan2(thief.y - this.y, thief.x - this.x);
      }
    },

    // Jarak ke pencuri; dipakai untuk "ketahuan karena disentuh".
    touchesThief(thief) {
      return Math.hypot(thief.x - this.x, thief.y - this.y) < CATCH_DISTANCE;
    },
  };
}

export function createGuards(defs) {
  return defs.map((def, i) => createGuard(def, i));
}
