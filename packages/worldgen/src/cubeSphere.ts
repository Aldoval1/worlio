import type { Vector3D } from '@universo/shared';
import type { TerrainSampler } from './terrainSampler.js';

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

  const len = Math.hypot(x, y, z);
  return {
    x: x / len,
    y: y / len,
    z: z / len
  };
}

export interface CubeSphereFaceData {
  face: CubeFace;
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  oceanPositions: Float32Array;
  oceanIndices: Uint32Array;
  vertexCount: number;
  triangleCount: number;
}

/**
 * Genera la geometría completa (tierra y concha oceánica) para una cara de la cube-sphere.
 * subdivision: número de quads por lado (ej. 32 -> 33x33 vértices).
 */
export function generateCubeSphereFaceGeometry(
  face: CubeFace,
  subdivision: number,
  sampler: TerrainSampler,
  radiusMeters: number,
  seaLevelMeters: number
): CubeSphereFaceData {
  const verticesPerSide = subdivision + 1;
  const numVertices = verticesPerSide * verticesPerSide;
  const numIndices = subdivision * subdivision * 6;

  const positions = new Float32Array(numVertices * 3);
  const normals = new Float32Array(numVertices * 3);
  const colors = new Float32Array(numVertices * 4); // RGBA
  const indices = new Uint32Array(numIndices);

  const oceanPositions = new Float32Array(numVertices * 3);
  const oceanIndices = new Uint32Array(numIndices);

  let vIdx = 0;
  for (let j = 0; j <= subdivision; j++) {
    const v = (j / subdivision) * 2.0 - 1.0;

    for (let i = 0; i <= subdivision; i++) {
      const u = (i / subdivision) * 2.0 - 1.0;
      const d = cubeFaceToSphereDirection(face, u, v);

      // Muestrear altura del relieve
      const sample = sampler.sample(d.x, d.y, d.z);
      const rSurface = radiusMeters + sample.heightMeters;
      const rOcean = radiusMeters + seaLevelMeters;

      // Posición del relieve
      positions[vIdx * 3] = d.x * rSurface;
      positions[vIdx * 3 + 1] = d.y * rSurface;
      positions[vIdx * 3 + 2] = d.z * rSurface;

      // Posición del océano (concha esférica lisa al nivel del mar)
      oceanPositions[vIdx * 3] = d.x * rOcean;
      oceanPositions[vIdx * 3 + 1] = d.y * rOcean;
      oceanPositions[vIdx * 3 + 2] = d.z * rOcean;

      // Normal base apuntando hacia afuera
      normals[vIdx * 3] = d.x;
      normals[vIdx * 3 + 1] = d.y;
      normals[vIdx * 3 + 2] = d.z;

      // Asignar color por bioma (RGBA)
      let r = 0.196, g = 0.321, b = 0.204; // Templado verde
      if (sample.isWater) {
        r = 0.055; g = 0.141; b = 0.263; // Azul marino #0E2443
      } else if (sample.biome === 'SNOW_PEAK') {
        r = 0.886; g = 0.914; b = 0.941; // Nieve
      } else if (sample.biome === 'ROCKY_MOUNTAIN') {
        r = 0.282; g = 0.306; b = 0.349; // Roca gris
      } else if (sample.biome === 'DESERT') {
        r = 0.729; g = 0.616; b = 0.447; // Arena
      }

      colors[vIdx * 4] = r;
      colors[vIdx * 4 + 1] = g;
      colors[vIdx * 4 + 2] = b;
      colors[vIdx * 4 + 3] = 1.0;

      vIdx++;
    }
  }

  // Generar índices con winding exterior consistente
  let iIdx = 0;
  for (let j = 0; j < subdivision; j++) {
    for (let i = 0; i < subdivision; i++) {
      const row1 = j * verticesPerSide;
      const row2 = (j + 1) * verticesPerSide;

      const i0 = row1 + i;
      const i1 = row1 + i + 1;
      const i2 = row2 + i;
      const i3 = row2 + i + 1;

      // Triángulo 1
      indices[iIdx] = i0;
      indices[iIdx + 1] = i2;
      indices[iIdx + 2] = i1;

      oceanIndices[iIdx] = i0;
      oceanIndices[iIdx + 1] = i2;
      oceanIndices[iIdx + 2] = i1;

      // Triángulo 2
      indices[iIdx + 3] = i1;
      indices[iIdx + 4] = i2;
      indices[iIdx + 5] = i3;

      oceanIndices[iIdx + 3] = i1;
      oceanIndices[iIdx + 4] = i2;
      oceanIndices[iIdx + 5] = i3;

      iIdx += 6;
    }
  }

  return {
    face,
    positions,
    normals,
    colors,
    indices,
    oceanPositions,
    oceanIndices,
    vertexCount: numVertices,
    triangleCount: numIndices / 3
  };
}
