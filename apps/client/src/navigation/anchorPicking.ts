import type { Vector3D } from '@universo/shared';
import type { TerrainSampler } from '@universo/worldgen';
import { clampAltitude } from './zoomMath.js';

export interface RaySphereIntersection {
  hit: boolean;
  distance: number;
  point: Vector3D;
}

/**
 * Calcula la intersección analítica exacta entre un rayo y la esfera planetaria (ECEF).
 */
export function intersectRayWithPlanetSphere(
  rayOrigin: Vector3D,
  rayDirection: Vector3D,
  planetRadiusMeters: number
): RaySphereIntersection {
  const dirLen = Math.hypot(rayDirection.x, rayDirection.y, rayDirection.z);
  if (dirLen < 1e-9) {
    return { hit: false, distance: 0, point: { x: 0, y: 0, z: 0 } };
  }

  const dx = rayDirection.x / dirLen;
  const dy = rayDirection.y / dirLen;
  const dz = rayDirection.z / dirLen;

  const ox = rayOrigin.x;
  const oy = rayOrigin.y;
  const oz = rayOrigin.z;

  const b = 2.0 * (ox * dx + oy * dy + oz * dz);
  const c = ox * ox + oy * oy + oz * oz - planetRadiusMeters * planetRadiusMeters;

  const discriminant = b * b - 4.0 * c;
  if (discriminant < 0) {
    return { hit: false, distance: 0, point: { x: 0, y: 0, z: 0 } };
  }

  const sqrtDisc = Math.sqrt(discriminant);
  const t0 = (-b - sqrtDisc) * 0.5;
  const t1 = (-b + sqrtDisc) * 0.5;

  let t = t0;
  if (t < 0) {
    t = t1;
  }

  if (t < 0) {
    return { hit: false, distance: 0, point: { x: 0, y: 0, z: 0 } };
  }

  const hitPoint: Vector3D = {
    x: ox + dx * t,
    y: oy + dy * t,
    z: oz + dz * t
  };

  return { hit: true, distance: t, point: hitPoint };
}

/**
 * Refina la posición del anclaje sobre el relieve real usando el TerrainSampler.
 */
export function refineIntersectionWithTerrain(
  rayOrigin: Vector3D,
  rayDirection: Vector3D,
  approxHitPoint: Vector3D,
  sampler: TerrainSampler,
  planetRadiusMeters: number,
  maxIterations = 6
): Vector3D {
  let currentT = Math.hypot(
    approxHitPoint.x - rayOrigin.x,
    approxHitPoint.y - rayOrigin.y,
    approxHitPoint.z - rayOrigin.z
  );

  const dirLen = Math.hypot(rayDirection.x, rayDirection.y, rayDirection.z);
  const dx = rayDirection.x / dirLen;
  const dy = rayDirection.y / dirLen;
  const dz = rayDirection.z / dirLen;

  for (let i = 0; i < maxIterations; i++) {
    const px = rayOrigin.x + dx * currentT;
    const py = rayOrigin.y + dy * currentT;
    const pz = rayOrigin.z + dz * currentT;

    const r = Math.hypot(px, py, pz);
    if (r < 1e-4) break;

    const sample = sampler.sample(px / r, py / r, pz / r);
    const targetR = planetRadiusMeters + sample.heightMeters;
    const diff = r - targetR;

    if (Math.abs(diff) < 0.1) {
      return { x: px, y: py, z: pz };
    }

    const pDotD = px * dx + py * dy + pz * dz;
    const drDt = pDotD / r;
    if (Math.abs(drDt) < 1e-4) break;

    currentT -= diff / drDt;
  }

  const fx = rayOrigin.x + dx * currentT;
  const fy = rayOrigin.y + dy * currentT;
  const fz = rayOrigin.z + dz * currentT;
  return { x: fx, y: fy, z: fz };
}

/**
 * Aplica desplazamiento de zoom anclado al cursor geográfico.
 * La cámara se mueve a lo largo de la línea que une la cámara con el punto ancla en la superficie,
 * asegurando que el objetivo bajo el cursor no se desplace en pantalla durante el zoom.
 */
export function applyCursorAnchoredZoom(
  currentCameraPos: Vector3D,
  anchorPoint: Vector3D,
  zoomStepMeters: number,
  planetRadiusMeters: number,
  minAltitude = 2.0
): { newCameraPos: Vector3D; newAltitude: number } {
  const vx = currentCameraPos.x - anchorPoint.x;
  const vy = currentCameraPos.y - anchorPoint.y;
  const vz = currentCameraPos.z - anchorPoint.z;

  const currentAnchorDist = Math.hypot(vx, vy, vz);
  if (currentAnchorDist < 1e-3) {
    return {
      newCameraPos: { ...currentCameraPos },
      newAltitude: Math.hypot(currentCameraPos.x, currentCameraPos.y, currentCameraPos.z) - planetRadiusMeters
    };
  }

  // Nueva distancia al ancla reducida/aumentada por el zoomStep
  let newAnchorDist = currentAnchorDist - zoomStepMeters;

  // Garantizar altitud mínima sobre la superficie
  const anchorRadius = Math.hypot(anchorPoint.x, anchorPoint.y, anchorPoint.z);
  const minAllowedAnchorDist = Math.max(minAltitude, minAltitude);
  if (newAnchorDist < minAllowedAnchorDist) {
    newAnchorDist = minAllowedAnchorDist;
  }

  const factor = newAnchorDist / currentAnchorDist;
  const newX = anchorPoint.x + vx * factor;
  const newY = anchorPoint.y + vy * factor;
  const newZ = anchorPoint.z + vz * factor;

  const newCenterDist = Math.hypot(newX, newY, newZ);
  const rawAltitude = newCenterDist - anchorRadius;
  const clampedAlt = clampAltitude(rawAltitude, minAltitude);

  return {
    newCameraPos: { x: newX, y: newY, z: newZ },
    newAltitude: clampedAlt
  };
}
