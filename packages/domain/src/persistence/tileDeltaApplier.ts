import type { TilePersistedState } from './types.js';

export interface ModifiableTileGeometry {
  id: string;
  bounds: { uMin: number; uMax: number; vMin: number; vMax: number };
  localAnchor: { x: number; y: number; z: number };
  worldPositions: Float64Array;
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  heights: Float32Array;
  indices: Uint32Array;
}

/**
 * Aplica de forma determinista las modificaciones persistidas en SQLite
 * (excavaciones, terraplenes, carreteras) sobre la geometría generada de una tesela.
 */
export function applyPersistedDeltasToTileGeometry<T extends ModifiableTileGeometry>(
  geom: T,
  state: TilePersistedState,
  subdivision = 32
): T {
  if (state.modifications.length === 0 && state.roads.length === 0) {
    return geom;
  }

  const verticesPerEdge = subdivision + 1;
  const numVertices = geom.heights.length;

  // Clonar buffers para evitar mutar geometría cacheada no versionada
  const worldPositions = new Float64Array(geom.worldPositions);
  const positions = new Float32Array(geom.positions);
  const normals = new Float32Array(geom.normals);
  const colors = new Float32Array(geom.colors);
  const heights = new Float32Array(geom.heights);

  const modifiedIndices = new Set<number>();

  // 1. Aplicar modificaciones de relieve
  for (const mod of state.modifications) {
    const vIdx = mod.vertexIndex;
    if (vIdx < 0 || vIdx >= numVertices) continue;

    modifiedIndices.add(vIdx);

    const oldHeight = heights[vIdx]!;
    const newHeight = oldHeight + mod.heightDeltaMeters;
    heights[vIdx] = newHeight;

    // Actualizar coordenadas mundiales ECEF desplazando a lo largo del radio
    const wx = worldPositions[vIdx * 3]!;
    const wy = worldPositions[vIdx * 3 + 1]!;
    const wz = worldPositions[vIdx * 3 + 2]!;
    const rOld = Math.hypot(wx, wy, wz);
    const ux = wx / rOld;
    const uy = wy / rOld;
    const uz = wz / rOld;

    const rNew = rOld + mod.heightDeltaMeters;
    const newWx = ux * rNew;
    const newWy = uy * rNew;
    const newWz = uz * rNew;

    worldPositions[vIdx * 3] = newWx;
    worldPositions[vIdx * 3 + 1] = newWy;
    worldPositions[vIdx * 3 + 2] = newWz;

    // Posición relativa al ancla local
    positions[vIdx * 3] = newWx - geom.localAnchor.x;
    positions[vIdx * 3 + 1] = newWy - geom.localAnchor.y;
    positions[vIdx * 3 + 2] = newWz - geom.localAnchor.z;

    // Biome override opcional
    if (mod.biomeOverride === 'QUARRY_ROCK') {
      colors[vIdx * 4] = 0.45; // Roca de cantera excavada
      colors[vIdx * 4 + 1] = 0.42;
      colors[vIdx * 4 + 2] = 0.38;
      colors[vIdx * 4 + 3] = 1.0;
    }
  }

  // 2. Aplicar coloración y compactación de carreteras
  for (const road of state.roads) {
    // Proyectar segmentos de carretera sobre los vértices del tile
    const uSpan = geom.bounds.uMax - geom.bounds.uMin;
    const vSpan = geom.bounds.vMax - geom.bounds.vMin;

    for (let j = 0; j <= subdivision; j++) {
      const v = geom.bounds.vMin + (j / subdivision) * vSpan;
      for (let i = 0; i <= subdivision; i++) {
        const u = geom.bounds.uMin + (i / subdivision) * uSpan;
        const vIdx = j * verticesPerEdge + i;

        // Distancia punto a segmento en espacio UV
        const dist = pointToSegmentDistance(u, v, road.uStart, road.vStart, road.uEnd, road.vEnd);
        const threshold = 0.015; // Franja de carretera

        if (dist < threshold) {
          // Color de carretera (asfalto oscuro o tierra compactada)
          if (road.roadType === 'PAVED_ROAD' || road.roadType === 'HIGHWAY') {
            colors[vIdx * 4] = 0.22;
            colors[vIdx * 4 + 1] = 0.22;
            colors[vIdx * 4 + 2] = 0.24;
          } else {
            colors[vIdx * 4] = 0.55;
            colors[vIdx * 4 + 1] = 0.45;
            colors[vIdx * 4 + 2] = 0.32;
          }
        }
      }
    }
  }

  // 3. Recalcular normales topográficas analíticas en vértices modificados y sus vecinos
  for (let j = 0; j <= subdivision; j++) {
    for (let i = 0; i <= subdivision; i++) {
      const idx = j * verticesPerEdge + i;

      // Solo recalcular si el vértice o sus adyacentes cambiaron
      if (
        modifiedIndices.has(idx) ||
        modifiedIndices.has(idx - 1) ||
        modifiedIndices.has(idx + 1) ||
        modifiedIndices.has(idx - verticesPerEdge) ||
        modifiedIndices.has(idx + verticesPerEdge)
      ) {
        const iPrev = Math.max(0, i - 1);
        const iNext = Math.min(subdivision, i + 1);
        const idxUPrev = (j * verticesPerEdge + iPrev) * 3;
        const idxUNext = (j * verticesPerEdge + iNext) * 3;

        const tuX = worldPositions[idxUNext]! - worldPositions[idxUPrev]!;
        const tuY = worldPositions[idxUNext + 1]! - worldPositions[idxUPrev + 1]!;
        const tuZ = worldPositions[idxUNext + 2]! - worldPositions[idxUPrev + 2]!;

        const jPrev = Math.max(0, j - 1);
        const jNext = Math.min(subdivision, j + 1);
        const idxVPrev = (jPrev * verticesPerEdge + i) * 3;
        const idxVNext = (jNext * verticesPerEdge + i) * 3;

        const tvX = worldPositions[idxVNext]! - worldPositions[idxVPrev]!;
        const tvY = worldPositions[idxVNext + 1]! - worldPositions[idxVPrev + 1]!;
        const tvZ = worldPositions[idxVNext + 2]! - worldPositions[idxVPrev + 2]!;

        let nx = tuY * tvZ - tuZ * tvY;
        let ny = tuZ * tvX - tuX * tvZ;
        let nz = tuX * tvY - tuY * tvX;

        const rx = worldPositions[idx * 3]!;
        const ry = worldPositions[idx * 3 + 1]!;
        const rz = worldPositions[idx * 3 + 2]!;
        if (nx * rx + ny * ry + nz * rz < 0) {
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
  }

  return {
    ...geom,
    worldPositions,
    positions,
    normals,
    colors,
    heights
  };
}

function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  return Math.hypot(px - projX, py - projY);
}
