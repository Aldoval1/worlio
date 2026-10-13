import { describe, it, expect } from 'vitest';
import { Vec3Math } from './index.js';

describe('Vec3Math (Matemática 3D Compartida)', () => {
  it('calcula producto vectorial (cross product) en mano derecha', () => {
    // Eje X (1, 0, 0) x Eje Y (0, 1, 0) = Eje Z (0, 0, 1)
    const x = Vec3Math.create(1, 0, 0);
    const y = Vec3Math.create(0, 1, 0);
    const z = Vec3Math.cross(x, y);

    expect(z.x).toBe(0);
    expect(z.y).toBe(0);
    expect(z.z).toBe(1);
  });

  it('normaliza vectores preservando dirección', () => {
    const v = Vec3Math.create(0, 10, 0);
    const n = Vec3Math.normalize(v);
    expect(n.y).toBe(1);
    expect(Vec3Math.length(n)).toBeCloseTo(1.0);
  });
});
