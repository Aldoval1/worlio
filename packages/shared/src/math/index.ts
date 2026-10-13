/**
 * Matemática 3D de alta precisión para Universo RTS (shared)
 */

export interface Vec3Object {
  x: number;
  y: number;
  z: number;
}

export const Vec3Math = {
  create(x = 0, y = 0, z = 0): Vec3Object {
    return { x, y, z };
  },

  length(v: Vec3Object): number {
    return Math.hypot(v.x, v.y, v.z);
  },

  normalize(v: Vec3Object): Vec3Object {
    const len = Math.hypot(v.x, v.y, v.z);
    if (len > 0.0000001) {
      const inv = 1 / len;
      return { x: v.x * inv, y: v.y * inv, z: v.z * inv };
    }
    return { x: 0, y: 0, z: 0 };
  },

  add(a: Vec3Object, b: Vec3Object): Vec3Object {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  },

  sub(a: Vec3Object, b: Vec3Object): Vec3Object {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  },

  scale(a: Vec3Object, s: number): Vec3Object {
    return { x: a.x * s, y: a.y * s, z: a.z * s };
  },

  dot(a: Vec3Object, b: Vec3Object): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  },

  cross(a: Vec3Object, b: Vec3Object): Vec3Object {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  },

  distance(a: Vec3Object, b: Vec3Object): number {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  }
};
