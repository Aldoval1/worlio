/**
 * Worlio Plane Generator
 * Genera un plano 3D en el espacio horizontal (Plano XZ, Y = 0)
 * Adecuado para el suelo / terreno de un videojuego 3D
 */

export function createPlaneGeometry(size = 40, subdivisions = 40) {
  const halfSize = size / 2;
  const numVertices = (subdivisions + 1) * (subdivisions + 1);
  const numIndices = subdivisions * subdivisions * 6;

  // Formato de vértice intercalado (stride = 8 floats = 32 bytes):
  // [pos.x, pos.y, pos.z, norm.x, norm.y, norm.z, uv.u, uv.v]
  const vertexData = new Float32Array(numVertices * 8);
  const indexData = new Uint16Array(numIndices);

  let vOffset = 0;
  for (let z = 0; z <= subdivisions; z++) {
    const v = z / subdivisions;
    const posZ = -halfSize + v * size;

    for (let x = 0; x <= subdivisions; x++) {
      const u = x / subdivisions;
      const posX = -halfSize + u * size;

      // Posición (X, Y, Z) - Y es 0 (suelo plano)
      vertexData[vOffset++] = posX;
      vertexData[vOffset++] = 0.0;
      vertexData[vOffset++] = posZ;

      // Normal apuntando hacia arriba (0, 1, 0)
      vertexData[vOffset++] = 0.0;
      vertexData[vOffset++] = 1.0;
      vertexData[vOffset++] = 0.0;

      // UVs
      vertexData[vOffset++] = u;
      vertexData[vOffset++] = v;
    }
  }

  let iOffset = 0;
  for (let z = 0; z < subdivisions; z++) {
    for (let x = 0; x < subdivisions; x++) {
      const row1 = z * (subdivisions + 1);
      const row2 = (z + 1) * (subdivisions + 1);

      const i0 = row1 + x;
      const i1 = row1 + x + 1;
      const i2 = row2 + x;
      const i3 = row2 + x + 1;

      // Primer triángulo (i0, i2, i1)
      indexData[iOffset++] = i0;
      indexData[iOffset++] = i2;
      indexData[iOffset++] = i1;

      // Segundo triángulo (i1, i2, i3)
      indexData[iOffset++] = i1;
      indexData[iOffset++] = i2;
      indexData[iOffset++] = i3;
    }
  }

  return {
    vertexData,
    indexData,
    indexCount: indexData.length,
    vertexCount: numVertices,
    size,
    subdivisions
  };
}
