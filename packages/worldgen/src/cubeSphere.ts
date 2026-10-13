import type { Vector3D } from '@universo/shared';

export type CubeFace = 'PX' | 'NX' | 'PY' | 'NY' | 'PZ' | 'NZ';

export const CUBE_FACES: CubeFace[] = ['PX', 'NX', 'PY', 'NY', 'PZ', 'NZ'];

/**
 * Convierte coordenadas (u, v) en [-1, 1] de una cara del cubo a un vector
 * unitario normalizado sobre la esfera (proyección radial).
 */
export function cubeFaceToSphereDirection(face: CubeFace, u: number, v: number): Vector3D {
  let x = 0;
  let y = 0;
  let z = 0;

  switch (face) {
    case 'PX': // +X
      x = 1.0;
      y = -v;
      z = -u;
      break;
    case 'NX': // -X
      x = -1.0;
      y = -v;
      z = u;
      break;
    case 'PY': // +Y
      x = u;
      y = 1.0;
      z = v;
      break;
    case 'NY': // -Y
      x = u;
      y = -1.0;
      z = -v;
      break;
    case 'PZ': // +Z
      x = u;
      y = -v;
      z = 1.0;
      break;
    case 'NZ': // -Z
      x = -u;
      y = -v;
      z = -1.0;
      break;
  }

  // Normalizar vector para obtener proyección esférica perfecta
  const len = Math.hypot(x, y, z);
  return {
    x: x / len,
    y: y / len,
    z: z / len
  };
}
