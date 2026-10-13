import type { Vector3D } from '@universo/shared';
import { type CubeFace, cubeFaceToSphereDirection } from '../cubeSphere.js';
import type { TileBounds } from '../tiles/types.js';
import type { LodCameraState } from './types.js';

/**
 * Calcula el error geométrico representativo para una tesela a nivel L.
 * A nivel 0 (cara completa del cubo), el error respecto a la esfera es proporcional al radio.
 * Cada subdivisión diádica reduce el error a la mitad (2^-L).
 */
export function calculateGeometricError(planetRadiusMeters: number, level: number): number {
  const baseError = planetRadiusMeters * 0.05; // ~6.250 m para planeta de 125 km
  return baseError / Math.pow(2, level);
}

/**
 * Calcula el error geométrico proyectado en píxeles de pantalla (Screen Space Error - SSE).
 */
export function calculateScreenSpaceError(
  geometricErrorMeters: number,
  distanceMeters: number,
  camera: LodCameraState
): number {
  const safeDistance = Math.max(1.0, distanceMeters);
  const tanHalfFov = Math.tan(camera.fovRadians * 0.5);
  return (geometricErrorMeters * camera.viewportHeightPixels) / (2.0 * safeDistance * tanHalfFov);
}

/**
 * Calcula el centro geométrico y el radio de la esfera delimitadora (Bounding Sphere)
 * en coordenadas ECEF para una tesela en espacio continuo de cara [-1, 1].
 */
export function calculateTileBoundingSphere(
  bounds: TileBounds,
  face: CubeFace,
  planetRadiusMeters: number
): { center: Vector3D; radiusMeters: number } {
  const uCenter = (bounds.uMin + bounds.uMax) * 0.5;
  const vCenter = (bounds.vMin + bounds.vMax) * 0.5;
  const dCenter = cubeFaceToSphereDirection(face, uCenter, vCenter);

  const center: Vector3D = {
    x: dCenter.x * planetRadiusMeters,
    y: dCenter.y * planetRadiusMeters,
    z: dCenter.z * planetRadiusMeters
  };

  // Calcular distancia máxima a las 4 esquinas de la tesela
  const corners = [
    cubeFaceToSphereDirection(face, bounds.uMin, bounds.vMin),
    cubeFaceToSphereDirection(face, bounds.uMax, bounds.vMin),
    cubeFaceToSphereDirection(face, bounds.uMin, bounds.vMax),
    cubeFaceToSphereDirection(face, bounds.uMax, bounds.vMax)
  ];

  let maxRadiusSq = 0;
  for (const corner of corners) {
    const cx = corner.x * planetRadiusMeters - center.x;
    const cy = corner.y * planetRadiusMeters - center.y;
    const cz = corner.z * planetRadiusMeters - center.z;
    const distSq = cx * cx + cy * cy + cz * cz;
    if (distSq > maxRadiusSq) {
      maxRadiusSq = distSq;
    }
  }

  return {
    center,
    radiusMeters: Math.sqrt(maxRadiusSq)
  };
}

/**
 * Prueba de descarte por horizonte planetario (Planetary Horizon Culling).
 * Determina si la esfera delimitadora de una tesela se encuentra completamente oculta
 * detrás de la curvatura del planeta desde la posición actual de la cámara.
 */
export function isOccludedByPlanetaryHorizon(
  tileCenter: Vector3D,
  tileRadiusMeters: number,
  cameraPos: Vector3D,
  planetRadiusMeters: number
): boolean {
  const camDistSq = cameraPos.x * cameraPos.x + cameraPos.y * cameraPos.y + cameraPos.z * cameraPos.z;
  const camDist = Math.sqrt(camDistSq);

  // Si la cámara está en o bajo el radio planetario, no hay oclusión orbital
  if (camDist <= planetRadiusMeters * 1.001) {
    return false;
  }

  const tileDistSq = tileCenter.x * tileCenter.x + tileCenter.y * tileCenter.y + tileCenter.z * tileCenter.z;
  const tileDist = Math.sqrt(tileDistSq);
  if (tileDist < 1.0) return false;

  // Ángulo de apertura del horizonte desde el centro del planeta
  // cos(horizonAngle) = R / camDist
  const cosHorizon = planetRadiusMeters / camDist;
  const horizonAngle = Math.acos(Math.min(1.0, Math.max(-1.0, cosHorizon)));

  // Ángulo subtendido por la tesela respecto al centro del planeta
  const dot =
    (cameraPos.x * tileCenter.x + cameraPos.y * tileCenter.y + cameraPos.z * tileCenter.z) /
    (camDist * tileDist);
  const angleToTile = Math.acos(Math.min(1.0, Math.max(-1.0, dot)));

  // Sub-ángulo angular que cubre el radio de la tesela
  const tileAngularRadius = Math.asin(Math.min(1.0, tileRadiusMeters / tileDist));

  // La tesela está completamente detrás del horizonte si el ángulo angular excede el horizonte + radio
  return angleToTile > horizonAngle + tileAngularRadius;
}
