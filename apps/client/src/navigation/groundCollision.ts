import type { Vector3D } from '@universo/shared';
import type { TerrainSampler } from '@universo/worldgen';

export const MIN_GROUND_CLEARANCE_METERS = 2.0; // Descenso estricto hasta 2 m
export const CAMERA_COLLISION_RADIUS_METERS = 1.0; // Radio de cápsula/esfera de colisión

export interface GroundQueryResult {
  groundPoint: Vector3D;
  surfaceRadiusMeters: number;
  clearanceMeters: number;
  isPenetrating: boolean;
  normal: Vector3D;
}

/**
 * Consulta la elevación real del relieve bajo una posición de cámara en coordenadas ECEF.
 */
export function queryGroundUnderPosition(
  position: Vector3D,
  sampler: TerrainSampler,
  planetRadiusMeters: number
): GroundQueryResult {
  const distToCenter = Math.hypot(position.x, position.y, position.z);
  const safeDist = Math.max(1.0, distToCenter);

  const ux = position.x / safeDist;
  const uy = position.y / safeDist;
  const uz = position.z / safeDist;

  const sample = sampler.sample(ux, uy, uz);
  const surfaceRadius = planetRadiusMeters + sample.heightMeters;
  const clearance = distToCenter - surfaceRadius;

  const groundPoint: Vector3D = {
    x: ux * surfaceRadius,
    y: uy * surfaceRadius,
    z: uz * surfaceRadius
  };

  const normal = computeTerrainNormal(ux, uy, uz, sampler, planetRadiusMeters);

  return {
    groundPoint,
    surfaceRadiusMeters: surfaceRadius,
    clearanceMeters: clearance,
    isPenetrating: clearance < MIN_GROUND_CLEARANCE_METERS,
    normal
  };
}

/**
 * Aplica colisión física de suelo y previene que la cámara penetre el relieve (< 2 m).
 */
export function resolveGroundCollision(
  cameraPos: Vector3D,
  sampler: TerrainSampler,
  planetRadiusMeters: number,
  minClearance = MIN_GROUND_CLEARANCE_METERS
): Vector3D {
  const dist = Math.hypot(cameraPos.x, cameraPos.y, cameraPos.z);
  const safeDist = Math.max(1.0, dist);

  const ux = cameraPos.x / safeDist;
  const uy = cameraPos.y / safeDist;
  const uz = cameraPos.z / safeDist;

  const sample = sampler.sample(ux, uy, uz);
  const surfaceRadius = planetRadiusMeters + sample.heightMeters;
  const requiredDist = surfaceRadius + minClearance;

  if (dist < requiredDist) {
    return {
      x: ux * requiredDist,
      y: uy * requiredDist,
      z: uz * requiredDist
    };
  }

  return { ...cameraPos };
}

/**
 * Calcula la normal física del relieve mediante diferencias finitas tangenciales en la esfera.
 */
export function computeTerrainNormal(
  ux: number,
  uy: number,
  uz: number,
  sampler: TerrainSampler,
  planetRadiusMeters: number,
  stepMeters = 5.0
): Vector3D {
  const angularStep = stepMeters / planetRadiusMeters;

  // Encontrar dos vectores ortogonales en el plano tangente
  let tx = -uy;
  let ty = ux;
  let tz = 0;
  if (Math.hypot(tx, ty) < 1e-4) {
    tx = 0;
    ty = -uz;
    tz = uy;
  }
  const tLen = Math.hypot(tx, ty, tz);
  tx /= tLen;
  ty /= tLen;
  tz /= tLen;

  // Producto cruzado para el segundo vector tangente: B = U x T
  const bx = uy * tz - uz * ty;
  const by = uz * tx - ux * tz;
  const bz = ux * ty - uy * tx;

  // Muestrear alturas en cruz (+T, -T, +B, -B)
  const hT1 = sampler.sample(ux + tx * angularStep, uy + ty * angularStep, uz + tz * angularStep).heightMeters;
  const hT0 = sampler.sample(ux - tx * angularStep, uy - ty * angularStep, uz - tz * angularStep).heightMeters;
  const hB1 = sampler.sample(ux + bx * angularStep, uy + by * angularStep, uz + bz * angularStep).heightMeters;
  const hB0 = sampler.sample(ux - bx * angularStep, uy - by * angularStep, uz - bz * angularStep).heightMeters;

  const dH_dT = (hT1 - hT0) / (2.0 * stepMeters);
  const dH_dB = (hB1 - hB0) / (2.0 * stepMeters);

  // Normal en el espacio local: N = U - dH/dT * T - dH/dB * B
  const nx = ux - tx * dH_dT - bx * dH_dB;
  const ny = uy - ty * dH_dT - by * dH_dB;
  const nz = uz - tz * dH_dT - bz * dH_dB;

  const nLen = Math.hypot(nx, ny, nz);
  return {
    x: nx / nLen,
    y: ny / nLen,
    z: nz / nLen
  };
}

/**
 * Resuelve el deslizamiento en pendientes pronunciadas (Slope slide projection).
 * Si la velocidad de desplazamiento intenta penetrar una montaña (v . N < 0),
 * deflexiona el vector proyectándolo tangencialmente al plano de la pendiente.
 */
export function slideAlongSlope(
  velocity: Vector3D,
  slopeNormal: Vector3D
): Vector3D {
  const dot = velocity.x * slopeNormal.x + velocity.y * slopeNormal.y + velocity.z * slopeNormal.z;

  // Solo deflexionar si el movimiento va hacia adentro de la superficie
  if (dot < 0.0) {
    return {
      x: velocity.x - dot * slopeNormal.x,
      y: velocity.y - dot * slopeNormal.y,
      z: velocity.z - dot * slopeNormal.z
    };
  }

  return { ...velocity };
}
