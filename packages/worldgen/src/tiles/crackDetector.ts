import { TILE_SUBDIVISIONS, getTileNeighbor } from './topology.js';
import type { AnyTileDirection, DiscontinuityReport, TileDirection, TileGeometryData } from './types.js';

/**
 * Obtiene los índices de vértice a lo largo de un borde específico de una tesela.
 */
function getEdgeVertexIndices(edge: TileDirection, subdivision: number = TILE_SUBDIVISIONS): number[] {
  const verticesPerEdge = subdivision + 1;
  const indices: number[] = [];

  switch (edge) {
    case 'TOP':
      for (let i = 0; i <= subdivision; i++) {
        indices.push(i); // j = 0
      }
      break;
    case 'BOTTOM':
      for (let i = 0; i <= subdivision; i++) {
        indices.push(subdivision * verticesPerEdge + i); // j = subdivision
      }
      break;
    case 'LEFT':
      for (let j = 0; j <= subdivision; j++) {
        indices.push(j * verticesPerEdge); // i = 0
      }
      break;
    case 'RIGHT':
      for (let j = 0; j <= subdivision; j++) {
        indices.push(j * verticesPerEdge + subdivision); // i = subdivision
      }
      break;
  }

  return indices;
}

/**
 * Evalúa la continuidad topológica y matemática a lo largo del borde compartido entre dos teselas adyacentes.
 * Detecta huecos (cracks / gaps), desalineaciones y discontinuidades numéricas en doble precisión.
 */
export function detectBoundaryDiscontinuities(
  tileA: TileGeometryData,
  tileB: TileGeometryData,
  directionFromAToB: AnyTileDirection,
  toleranceMeters: number = 1e-4 // 0.1 milímetros por defecto
): DiscontinuityReport {
  const neighborInfo = getTileNeighbor(tileA.key, directionFromAToB);

  // Validar que tileB corresponde efectivamente al vecino calculado
  if (
    tileB.key.face !== neighborInfo.neighbor.face ||
    tileB.key.level !== neighborInfo.neighbor.level ||
    tileB.key.x !== neighborInfo.neighbor.x ||
    tileB.key.y !== neighborInfo.neighbor.y
  ) {
    return {
      isContinuous: false,
      maxDistanceMeters: Number.POSITIVE_INFINITY,
      edgeLengthMeters: 0,
      vertexCount: 0,
      mismatchedVertices: 0,
      details: `tileB no coincide con el vecino esperado de tileA en dirección ${directionFromAToB}. Esperado: ${JSON.stringify(
        neighborInfo.neighbor
      )}, Recibido: ${JSON.stringify(tileB.key)}`
    };
  }

  const indicesA = getEdgeVertexIndices(
    getSharedEdgeOnTileA(directionFromAToB),
    TILE_SUBDIVISIONS
  );
  let indicesB = getEdgeVertexIndices(neighborInfo.targetEdge, TILE_SUBDIVISIONS);

  if (neighborInfo.inverted) {
    indicesB = indicesB.slice().reverse();
  }

  let maxDistance = 0;
  let mismatchedCount = 0;
  let totalEdgeLength = 0;

  for (let k = 0; k < indicesA.length; k++) {
    const idxA = indicesA[k];
    const idxB = indicesB[k];
    if (idxA === undefined || idxB === undefined) continue;

    const ax = tileA.worldPositions[idxA * 3] ?? 0;
    const ay = tileA.worldPositions[idxA * 3 + 1] ?? 0;
    const az = tileA.worldPositions[idxA * 3 + 2] ?? 0;

    const bx = tileB.worldPositions[idxB * 3] ?? 0;
    const by = tileB.worldPositions[idxB * 3 + 1] ?? 0;
    const bz = tileB.worldPositions[idxB * 3 + 2] ?? 0;

    const dx = ax - bx;
    const dy = ay - by;
    const dz = az - bz;
    const dist = Math.hypot(dx, dy, dz);

    if (dist > maxDistance) {
      maxDistance = dist;
    }

    if (dist > toleranceMeters) {
      mismatchedCount++;
    }

    if (k > 0) {
      const prevIdxA = indicesA[k - 1];
      if (prevIdxA !== undefined) {
        const pax = tileA.worldPositions[prevIdxA * 3] ?? 0;
        const pay = tileA.worldPositions[prevIdxA * 3 + 1] ?? 0;
        const paz = tileA.worldPositions[prevIdxA * 3 + 2] ?? 0;
        totalEdgeLength += Math.hypot(ax - pax, ay - pay, az - paz);
      }
    }
  }

  const isContinuous = maxDistance <= toleranceMeters;

  return {
    isContinuous,
    maxDistanceMeters: maxDistance,
    edgeLengthMeters: totalEdgeLength,
    vertexCount: indicesA.length,
    mismatchedVertices: mismatchedCount,
    details: isContinuous
      ? `Continuidad perfecta verificada (distancia máx = ${maxDistance.toExponential(3)} m <= ${toleranceMeters} m)`
      : `Discontinuidad detectada: ${mismatchedCount} vértices superan la tolerancia de ${toleranceMeters} m (máx = ${maxDistance.toExponential(3)} m)`
  };
}

function getSharedEdgeOnTileA(direction: AnyTileDirection): TileDirection {
  switch (direction) {
    case 'TOP':
    case 'NORTH':
      return 'TOP';
    case 'BOTTOM':
    case 'SOUTH':
      return 'BOTTOM';
    case 'LEFT':
    case 'WEST':
      return 'LEFT';
    case 'RIGHT':
    case 'EAST':
      return 'RIGHT';
  }
}
