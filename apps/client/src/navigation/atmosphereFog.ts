import { Color4 } from '@babylonjs/core';

export const ATMOSPHERE_TOP_ALTITUDE_METERS = 80_000.0; // 80 km (tope de atmósfera)
export const ATMOSPHERE_GROUND_ALTITUDE_METERS = 2_000.0; // 2 km (inicio de horizonte terrestre)

export interface AtmosphereParameters {
  density: number; // [0.0 en el espacio, 1.0 en superficie]
  skyColor: Color4;
  fogStartMeters: number;
  fogEndMeters: number;
}

export const SPACE_COLOR = new Color4(0.005, 0.008, 0.018, 1.0); // Negro cósmico
export const GROUND_SKY_COLOR = new Color4(0.38, 0.62, 0.88, 1.0); // Azul diurno atmosférico

/**
 * Calcula la función suave (Hermite smoothstep) en el rango [edge0, edge1].
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0.0, Math.min(1.0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3.0 - 2.0 * t);
}

/**
 * Calcula la densidad atmosférica relativa [0.0, 1.0] según la altitud libre.
 * 0.0 en el espacio (> 80 km), aumentando suavemente hasta 1.0 a nivel del suelo (< 2 km).
 */
export function calculateAtmosphereDensity(
  altitudeMeters: number,
  topAltitude = ATMOSPHERE_TOP_ALTITUDE_METERS,
  groundAltitude = ATMOSPHERE_GROUND_ALTITUDE_METERS
): number {
  if (altitudeMeters >= topAltitude) return 0.0;
  if (altitudeMeters <= groundAltitude) return 1.0;

  // Curva sigmoide invertida: a menor altitud, mayor densidad
  const norm = (topAltitude - altitudeMeters) / (topAltitude - groundAltitude);
  return smoothstep(0.0, 1.0, norm);
}

/**
 * Interpola el color del cielo/fondo entre el negro espacial y el azul atmosférico diurno.
 */
export function calculateAtmosphereSkyColor(
  density: number,
  spaceColor = SPACE_COLOR,
  groundSkyColor = GROUND_SKY_COLOR
): Color4 {
  const r = spaceColor.r + (groundSkyColor.r - spaceColor.r) * density;
  const g = spaceColor.g + (groundSkyColor.g - spaceColor.g) * density;
  const b = spaceColor.b + (groundSkyColor.b - spaceColor.b) * density;
  return new Color4(r, g, b, 1.0);
}

/**
 * Calcula los planos de niebla (fogStart, fogEnd) adaptados a la visibilidad del horizonte físico.
 * En órbita la niebla es infinita (desactivada); en superficie limita la visión a la distancia del horizonte.
 */
export function calculateAtmosphericFogRange(
  altitudeMeters: number,
  planetRadiusMeters: number
): { fogStart: number; fogEnd: number } {
  const density = calculateAtmosphereDensity(altitudeMeters);

  if (density < 0.01) {
    // Espacio profundo: niebla inactiva
    return { fogStart: 1e9, fogEnd: 1e10 };
  }

  // Distancia geométrica al horizonte visible: d = sqrt(h^2 + 2*R*h)
  const h = Math.max(10.0, altitudeMeters);
  const horizonDistance = Math.sqrt(h * h + 2.0 * planetRadiusMeters * h);

  // La niebla comienza a 1/3 de la distancia al horizonte y se hace opaca en el horizonte
  const fogStart = horizonDistance * 0.35;
  const fogEnd = horizonDistance * 1.15;

  return {
    fogStart: Math.max(500.0, fogStart),
    fogEnd: Math.max(2000.0, fogEnd)
  };
}

/**
 * Evalúa los parámetros atmosféricos completos para el frame actual.
 */
export function evaluateAtmosphere(
  altitudeMeters: number,
  planetRadiusMeters: number
): AtmosphereParameters {
  const density = calculateAtmosphereDensity(altitudeMeters);
  const skyColor = calculateAtmosphereSkyColor(density);
  const { fogStart, fogEnd } = calculateAtmosphericFogRange(altitudeMeters, planetRadiusMeters);

  return {
    density,
    skyColor,
    fogStartMeters: fogStart,
    fogEndMeters: fogEnd
  };
}
