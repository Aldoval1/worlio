import { TILE_SUBDIVISIONS } from '../tiles/topology.js';
import type { TileGeometryData } from '../tiles/types.js';

/**
 * Añade faldas geométricas (skirts) a lo largo de los 4 bordes exteriores de una tesela.
 * Las faldas se extienden radialmente hacia el núcleo del planeta para evitar
 * orificios o rendijas (pinholes / T-junction cracks) entre diferentes niveles de detalle.
 */
export function addTileSkirts(
  tileData: TileGeometryData,
  skirtDepthMeters: number
): TileGeometryData {
  const subdivision = TILE_SUBDIVISIONS;
  const verticesPerEdge = subdivision + 1;
  const originalVertexCount = tileData.vertexCount;
  const originalIndexCount = tileData.indices.length;

  // 4 bordes x verticesPerEdge = 4 * 33 = 132 vértices de falda
  const skirtVertexCount = verticesPerEdge * 4;
  const newVertexCount = originalVertexCount + skirtVertexCount;

  // 4 bordes x subdivision quads x 6 índices = 4 * 32 * 6 = 768 índices de falda (256 triángulos)
  const skirtIndexCount = subdivision * 4 * 6;
  const newIndexCount = originalIndexCount + skirtIndexCount;

  const positions = new Float32Array(newVertexCount * 3);
  const worldPositions = new Float64Array(newVertexCount * 3);
  const normals = new Float32Array(newVertexCount * 3);
  const colors = new Float32Array(newVertexCount * 4);
  const heights = new Float32Array(newVertexCount);
  const indices = new Uint32Array(newIndexCount);

  // Copiar buffers originales
  positions.set(tileData.positions);
  worldPositions.set(tileData.worldPositions);
  normals.set(tileData.normals);
  colors.set(tileData.colors);
  heights.set(tileData.heights);
  indices.set(tileData.indices);

  // Recolectar índices de borde originales (TOP, BOTTOM, LEFT, RIGHT)
  const edgeBorderIndices: number[][] = [
    [], // TOP (j = 0)
    [], // BOTTOM (j = subdivision)
    [], // LEFT (i = 0)
    []  // RIGHT (i = subdivision)
  ];

  for (let i = 0; i <= subdivision; i++) {
    edgeBorderIndices[0]!.push(i);
    edgeBorderIndices[1]!.push(subdivision * verticesPerEdge + i);
  }
  for (let j = 0; j <= subdivision; j++) {
    edgeBorderIndices[2]!.push(j * verticesPerEdge);
    edgeBorderIndices[3]!.push(j * verticesPerEdge + subdivision);
  }

  let skirtVOffset = originalVertexCount;
  let skirtIOffset = originalIndexCount;

  for (let edgeIdx = 0; edgeIdx < 4; edgeIdx++) {
    const borderList = edgeBorderIndices[edgeIdx]!;
    const skirtStartV = skirtVOffset;

    for (let k = 0; k < borderList.length; k++) {
      const origV = borderList[k]!;
      const nx = tileData.normals[origV * 3] ?? 0;
      const ny = tileData.normals[origV * 3 + 1] ?? 0;
      const nz = tileData.normals[origV * 3 + 2] ?? 0;

      // Desplazar el vértice hacia abajo a lo largo del vector normal inverso
      const wx = (tileData.worldPositions[origV * 3] ?? 0) - nx * skirtDepthMeters;
      const wy = (tileData.worldPositions[origV * 3 + 1] ?? 0) - ny * skirtDepthMeters;
      const wz = (tileData.worldPositions[origV * 3 + 2] ?? 0) - nz * skirtDepthMeters;

      worldPositions[skirtVOffset * 3] = wx;
      worldPositions[skirtVOffset * 3 + 1] = wy;
      worldPositions[skirtVOffset * 3 + 2] = wz;

      positions[skirtVOffset * 3] = wx - tileData.localAnchor.x;
      positions[skirtVOffset * 3 + 1] = wy - tileData.localAnchor.y;
      positions[skirtVOffset * 3 + 2] = wz - tileData.localAnchor.z;

      normals[skirtVOffset * 3] = nx;
      normals[skirtVOffset * 3 + 1] = ny;
      normals[skirtVOffset * 3 + 2] = nz;

      heights[skirtVOffset] = (tileData.heights[origV] ?? 0) - skirtDepthMeters;

      colors[skirtVOffset * 4] = (tileData.colors[origV * 4] ?? 0) * 0.7; // Ligeramente más oscuro
      colors[skirtVOffset * 4 + 1] = (tileData.colors[origV * 4 + 1] ?? 0) * 0.7;
      colors[skirtVOffset * 4 + 2] = (tileData.colors[origV * 4 + 2] ?? 0) * 0.7;
      colors[skirtVOffset * 4 + 3] = 1.0;

      skirtVOffset++;
    }

    // Coser franja de quads entre el borde original y la falda extruida
    for (let k = 0; k < subdivision; k++) {
      const top0 = borderList[k]!;
      const top1 = borderList[k + 1]!;
      const bot0 = skirtStartV + k;
      const bot1 = skirtStartV + k + 1;

      // Triángulo 1
      indices[skirtIOffset] = top0;
      indices[skirtIOffset + 1] = bot0;
      indices[skirtIOffset + 2] = top1;

      // Triángulo 2
      indices[skirtIOffset + 3] = top1;
      indices[skirtIOffset + 4] = bot0;
      indices[skirtIOffset + 5] = bot1;

      skirtIOffset += 6;
    }
  }

  return {
    ...tileData,
    positions,
    worldPositions,
    normals,
    colors,
    heights,
    indices,
    vertexCount: newVertexCount,
    triangleCount: newIndexCount / 3
  };
}
