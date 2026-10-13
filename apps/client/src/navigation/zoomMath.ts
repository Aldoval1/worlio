import type { Vector3D } from '@universo/shared';

export interface DampVelocity {
  value: number;
}

export const MIN_ALTITUDE_METERS = 2.0; // 2 metros sobre el suelo
export const MAX_ALTITUDE_METERS = 1_500_000.0; // 1.500 km en espacio profundo
export const DEFAULT_ZOOM_SENSITIVITY = 0.0015;

/**
 * Calcula la altitud libre sobre la superficie real del planeta (restando radio y relieve).
 */
export function calculateFreeAltitude(
  cameraPos: Vector3D,
  planetRadiusMeters: number,
  terrainElevationMeters = 0.0
): number {
  const centerDistance = Math.hypot(cameraPos.x, cameraPos.y, cameraPos.z);
  const surfaceRadius = planetRadiusMeters + terrainElevationMeters;
  return Math.max(0.0, centerDistance - surfaceRadius);
}

/**
 * Calcula el desplazamiento de zoom proporcional a la altitud libre (zoom logarítmico tipo Cesium).
 * A 300 km en órbita, un tick de rueda avanza miles de metros;
 * a 50 m del suelo, el mismo tick avanza solo unos centímetros/metros.
 */
export function calculateZoomDelta(
  currentAltitude: number,
  wheelDelta: number,
  sensitivity = DEFAULT_ZOOM_SENSITIVITY
): number {
  // Normalizar el delta del ratón / trackpad
  const clampedWheel = Math.max(-120.0, Math.min(120.0, wheelDelta));

  // Velocidad proporcional a la altitud actual con piso mínimo suave
  const effectiveSpeed = Math.max(4.0, currentAltitude * 0.18);
  return clampedWheel * effectiveSpeed * sensitivity;
}

/**
 * Limita la altitud calculada para impedir atravesar el terreno o alejarse al infinito.
 */
export function clampAltitude(
  altitude: number,
  minAltitude = MIN_ALTITUDE_METERS,
  maxAltitude = MAX_ALTITUDE_METERS
): number {
  return Math.max(minAltitude, Math.min(maxAltitude, altitude));
}

/**
 * Suavizado critically damped independiente del framerate (Hz-independent).
 * Evita saltos y parpadeo de cámara tanto en monitores de 60 Hz como de 144 Hz o VSync fluctuante.
 */
export function smoothDamp(
  current: number,
  target: number,
  velocity: DampVelocity,
  smoothTime: number,
  deltaTime: number
): number {
  const safeSmoothTime = Math.max(0.0001, smoothTime);
  const omega = 2.0 / safeSmoothTime;

  const x = omega * deltaTime;
  const exp = 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x);

  const change = current - target;
  const temp = (velocity.value + omega * change) * deltaTime;

  velocity.value = (velocity.value - omega * temp) * exp;
  const result = target + (change + temp) * exp;

  return result;
}
