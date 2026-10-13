import type { Vector3D } from '@universo/shared';
import { cubeFaceToSphereDirection } from '../cubeSphere.js';
import type { TerrainSampler } from '../terrainSampler.js';
import {
  TILE_SUBDIVISIONS,
  createTileId,
  getTileBounds
} from './topology.js';
import type { TileGeometryData, TileKey } from './types.js';

/**
 * Genera la geometría completa (33x33 vértices, 1024 quads) para una tesela individual de la cube-sphere.
 * Mantiene posiciones en doble precisión (Float64Array) para la simulación física y
 * posiciones relativas al ancla local (Float32Array) para renderizado WebGPU libre de jitter.
 */
export function generateTileGeometry(
  key: TileKey,
  sampler: TerrainSampler,
  radiusMeters: number,
  subdivision: number = TILE_SUBDIVISIONS
): TileGeometryData {
  const verticesPerEdge = subdivision + 1;
  const numVertices = verticesPerEdge * verticesPerEdge;
  const numIndices = subdivision * subdivision * 6;

  const bounds = getTileBounds(key);
  const id = createTileId(key);

  // Calcular ancla local en el centro geográfico de la tesela
  const uCenter = (bounds.uMin + bounds.uMax) * 0.5;
  const vCenter = (bounds.vMin + bounds.vMax) * 0.5;
  const dCenter = cubeFaceToSphereDirection(key.face, uCenter, vCenter);
  const centerSample = sampler.sample(dCenter.x, dCenter.y, dCenter.z);
  const rCenter = radiusMeters + centerSample.heightMeters;

  const center: Vector3D = {
    x: dCenter.x * rCenter,
    y: dCenter.y * rCenter,
    z: dCenter.z * rCenter
  };

  const localAnchor: Vector3D = { ...center };

  // Buffers
  const worldPositions = new Float64Array(numVertices * 3);
  const positions = new Float32Array(numVertices * 3);
  const normals = new Float32Array(numVertices * 3);
  const colors = new Float32Array(numVertices * 4);
  const heights = new Float32Array(numVertices);
  const indices = new Uint32Array(numIndices);

  const uSpan = bounds.uMax - bounds.uMin;
  const vSpan = bounds.vMax - bounds.vMin;

  let vIdx = 0;
  for (let j = 0; j <= subdivision; j++) {
    const v = bounds.vMin + (j / subdivision) * vSpan;

    for (let i = 0; i <= subdivision; i++) {
      const u = bounds.uMin + (i / subdivision) * uSpan;
      const d = cubeFaceToSphereDirection(key.face, u, v);
      const sample = sampler.sample(d.x, d.y, d.z);
      const r = radiusMeters + sample.heightMeters;

      const wx = d.x * r;
      const wy = d.y * r;
      const wz = d.z * r;

      // Coordenadas absolutas ECEF (Float64)
      worldPositions[vIdx * 3] = wx;
      worldPositions[vIdx * 3 + 1] = wy;
      worldPositions[vIdx * 3 + 2] = wz;

      // Coordenadas relativas al ancla local (Float32)
      positions[vIdx * 3] = wx - localAnchor.x;
      positions[vIdx * 3 + 1] = wy - localAnchor.y;
      positions[vIdx * 3 + 2] = wz - localAnchor.z;

      heights[vIdx] = sample.heightMeters;

      // Color de bioma desde la paleta PBR
      colors[vIdx * 4] = sample.color.r;
      colors[vIdx * 4 + 1] = sample.color.g;
      colors[vIdx * 4 + 2] = sample.color.b;
      colors[vIdx * 4 + 3] = sample.color.a;

      vIdx++;
    }
  }

  // Paso 2: Cálculo analítico de normales visuales topográficas por diferencias finitas en la malla
  for (let j = 0; j <= subdivision; j++) {
    for (let i = 0; i <= subdivision; i++) {
      const idx = j * verticesPerEdge + i;

      // Vecinos en eje U (horizontal)
      const iPrev = Math.max(0, i - 1);
      const iNext = Math.min(subdivision, i + 1);
      const idxUPrev = (j * verticesPerEdge + iPrev) * 3;
      const idxUNext = (j * verticesPerEdge + iNext) * 3;

      const tuX = worldPositions[idxUNext]! - worldPositions[idxUPrev]!;
      const tuY = worldPositions[idxUNext + 1]! - worldPositions[idxUPrev + 1]!;
      const tuZ = worldPositions[idxUNext + 2]! - worldPositions[idxUPrev + 2]!;

      // Vecinos en eje V (vertical)
      const jPrev = Math.max(0, j - 1);
      const jNext = Math.min(subdivision, j + 1);
      const idxVPrev = (jPrev * verticesPerEdge + i) * 3;
      const idxVNext = (jNext * verticesPerEdge + i) * 3;

      const tvX = worldPositions[idxVNext]! - worldPositions[idxVPrev]!;
      const tvY = worldPositions[idxVNext + 1]! - worldPositions[idxVPrev + 1]!;
      const tvZ = worldPositions[idxVNext + 2]! - worldPositions[idxVPrev + 2]!;

      // Producto cruzado: N = Tu x Tv
      let nx = tuY * tvZ - tuZ * tvY;
      let ny = tuZ * tvX - tuX * tvZ;
      let nz = tuX * tvY - tuY * tvX;

      // Asegurar que apunte hacia el exterior del planeta (mismo hemisferio que la posición radial)
      const rx = worldPositions[idx * 3]!;
      const ry = worldPositions[idx * 3 + 1]!;
      const rz = worldPositions[idx * 3 + 2]!;
      const dotRadial = nx * rx + ny * ry + nz * rz;
      if (dotRadial < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }

      const nLen = Math.max(1e-6, Math.hypot(nx, ny, nz));
      normals[idx * 3] = nx / nLen;
      normals[idx * 3 + 1] = ny / nLen;
      normals[idx * 3 + 2] = nz / nLen;
    }
  }

  // Generar índices con winding antihorario
  let iIdx = 0;
  for (let j = 0; j < subdivision; j++) {
    for (let i = 0; i < subdivision; i++) {
      const row1 = j * verticesPerEdge;
      const row2 = (j + 1) * verticesPerEdge;

      const i0 = row1 + i;
      const i1 = row1 + i + 1;
      const i2 = row2 + i;
      const i3 = row2 + i + 1;

      // Triángulo 1
      indices[iIdx] = i0;
      indices[iIdx + 1] = i2;
      indices[iIdx + 2] = i1;

      // Triángulo 2
      indices[iIdx + 3] = i1;
      indices[iIdx + 4] = i2;
      indices[iIdx + 5] = i3;

      iIdx += 6;
    }
  }

  return {
    key,
    id,
    bounds,
    center,
    localAnchor,
    positions,
    worldPositions,
    normals,
    colors,
    heights,
    indices,
    vertexCount: numVertices,
    triangleCount: subdivision * subdivision * 2
  };
}
