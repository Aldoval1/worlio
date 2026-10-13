import {
  Color3,
  Mesh,
  StandardMaterial,
  VertexData,
  type Scene
} from '@babylonjs/core';
import type { Vector3D } from '@universo/shared';
import type { RoadEdge } from '@universo/domain';

export interface RoadMeshOptions {
  wireframe?: boolean;
}

/**
 * Genera una malla de cinta (ribbon) en 3D para una carretera a lo largo de sus muestras proyectadas,
 * calculando normales y coordenadas relativas al ancla local para mitigación de jitter Float32.
 */
export function createRoadRibbonMesh(
  edge: RoadEdge,
  scene: Scene,
  localAnchor: Vector3D,
  options: RoadMeshOptions = {}
): Mesh {
  const mesh = new Mesh(`road_${edge.edgeId}`, scene);
  const samples = edge.samples;
  const numSamples = samples.length;

  if (numSamples < 2) {
    return mesh;
  }

  const halfWidth = edge.widthMeters * 0.5;
  const numVertices = numSamples * 2;
  const numIndices = (numSamples - 1) * 6;

  const positions = new Float32Array(numVertices * 3);
  const normals = new Float32Array(numVertices * 3);
  const uvs = new Float32Array(numVertices * 2);
  const colors = new Float32Array(numVertices * 4);
  const indices = new Uint32Array(numIndices);

  // Determinar color de calzada según tipo
  let r = 0.22,
    g = 0.22,
    b = 0.24; // Asfalto oscuro por defecto
  if (edge.roadType === 'DIRT_TRACK') {
    r = 0.55;
    g = 0.45;
    b = 0.32; // Tierra
  } else if (edge.roadType === 'GRAVEL_ROAD') {
    r = 0.45;
    g = 0.44;
    b = 0.42; // Grava
  }

  let accumulatedDist = 0;

  for (let i = 0; i < numSamples; i++) {
    const curr = samples[i]!;

    // Calcular vector tangente
    let tx = 0,
      ty = 0,
      tz = 0;
    if (i === 0) {
      const next = samples[1]!;
      tx = next.x - curr.x;
      ty = next.y - curr.y;
      tz = next.z - curr.z;
    } else if (i === numSamples - 1) {
      const prev = samples[i - 1]!;
      tx = curr.x - prev.x;
      ty = curr.y - prev.y;
      tz = curr.z - prev.z;
      accumulatedDist += Math.hypot(tx, ty, tz);
    } else {
      const prev = samples[i - 1]!;
      const next = samples[i + 1]!;
      tx = next.x - prev.x;
      ty = next.y - prev.y;
      tz = next.z - prev.z;
      accumulatedDist += Math.hypot(curr.x - prev.x, curr.y - prev.y, curr.z - prev.z);
    }

    const tLen = Math.max(1e-5, Math.hypot(tx, ty, tz));
    tx /= tLen;
    ty /= tLen;
    tz /= tLen;

    // Normal radial UP
    const upLen = Math.max(1e-5, Math.hypot(curr.x, curr.y, curr.z));
    const ux = curr.x / upLen;
    const uy = curr.y / upLen;
    const uz = curr.z / upLen;

    // Vector lateral RIGHT = T x Up
    let rx = ty * uz - tz * uy;
    let ry = tz * ux - tx * uz;
    let rz = tx * uy - ty * ux;
    const rLen = Math.max(1e-5, Math.hypot(rx, ry, rz));
    rx /= rLen;
    ry /= rLen;
    rz /= rLen;

    // Vértice izquierdo y derecho relativos al ancla local
    const leftX = curr.x - rx * halfWidth - localAnchor.x;
    const leftY = curr.y - ry * halfWidth - localAnchor.y;
    const leftZ = curr.z - rz * halfWidth - localAnchor.z;

    const rightX = curr.x + rx * halfWidth - localAnchor.x;
    const rightY = curr.y + ry * halfWidth - localAnchor.y;
    const rightZ = curr.z + rz * halfWidth - localAnchor.z;

    const idxLeft = i * 2;
    const idxRight = i * 2 + 1;

    // Posiciones
    positions[idxLeft * 3] = leftX;
    positions[idxLeft * 3 + 1] = leftY;
    positions[idxLeft * 3 + 2] = leftZ;

    positions[idxRight * 3] = rightX;
    positions[idxRight * 3 + 1] = rightY;
    positions[idxRight * 3 + 2] = rightZ;

    // Normales
    normals[idxLeft * 3] = ux;
    normals[idxLeft * 3 + 1] = uy;
    normals[idxLeft * 3 + 2] = uz;

    normals[idxRight * 3] = ux;
    normals[idxRight * 3 + 1] = uy;
    normals[idxRight * 3 + 2] = uz;

    // UVs
    const vCoord = accumulatedDist / edge.widthMeters;
    uvs[idxLeft * 2] = 0.0;
    uvs[idxLeft * 2 + 1] = vCoord;

    uvs[idxRight * 2] = 1.0;
    uvs[idxRight * 2 + 1] = vCoord;

    // Colores
    colors[idxLeft * 4] = r;
    colors[idxLeft * 4 + 1] = g;
    colors[idxLeft * 4 + 2] = b;
    colors[idxLeft * 4 + 3] = 1.0;

    colors[idxRight * 4] = r;
    colors[idxRight * 4 + 1] = g;
    colors[idxRight * 4 + 2] = b;
    colors[idxRight * 4 + 3] = 1.0;
  }

  // Índices para triángulos del listón
  let iIdx = 0;
  for (let i = 0; i < numSamples - 1; i++) {
    const l0 = i * 2;
    const r0 = i * 2 + 1;
    const l1 = (i + 1) * 2;
    const r1 = (i + 1) * 2 + 1;

    // Triángulo 1: (l0, r0, l1)
    indices[iIdx++] = l0;
    indices[iIdx++] = r0;
    indices[iIdx++] = l1;

    // Triángulo 2: (r0, r1, l1)
    indices[iIdx++] = r0;
    indices[iIdx++] = r1;
    indices[iIdx++] = l1;
  }

  mesh.position.set(localAnchor.x, localAnchor.y, localAnchor.z);

  const vertexData = new VertexData();
  vertexData.positions = Array.from(positions);
  vertexData.normals = Array.from(normals);
  vertexData.uvs = Array.from(uvs);
  vertexData.colors = Array.from(colors);
  vertexData.indices = Array.from(indices);
  vertexData.applyToMesh(mesh);

  // Material de carretera
  const mat = new StandardMaterial(`roadMat_${edge.edgeId}`, scene);
  mat.diffuseColor = new Color3(r, g, b);
  mat.specularColor = new Color3(0.08, 0.08, 0.08);
  mat.wireframe = options.wireframe ?? false;
  mesh.material = mat;

  return mesh;
}
