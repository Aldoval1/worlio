import type { BiomeType } from './types.js';

export interface BiomeClassificationInput {
  heightMeters: number;
  seaLevelMeters: number;
  latitudeNormalized: number; // 0.0 (ecuador) a 1.0 (polo)
  moisture: number; // 0.0 (árido) a 1.0 (saturado)
}

/**
 * Clasificación de bioma según el modelo bioclimático de Whittaker adaptado a escalas planetarias.
 * Combina latitud (insolación solar), altitud (gradiente adiabático de temperatura) y humedad ambiental.
 */
export function classifyBiome(input: BiomeClassificationInput): {
  biome: BiomeType;
  temperatureCelsius: number;
} {
  const { heightMeters, seaLevelMeters, latitudeNormalized, moisture } = input;
  const altitudeAboveSea = heightMeters - seaLevelMeters;

  // 1. Masas de agua
  if (altitudeAboveSea <= 0) {
    if (altitudeAboveSea > -250) {
      return { biome: 'SHALLOW_WATER', temperatureCelsius: 18 - 25 * latitudeNormalized };
    }
    return { biome: 'OCEAN', temperatureCelsius: 4 - 6 * latitudeNormalized };
  }

  // 2. Línea de costa (franja arenosa de transición mar-tierra)
  if (altitudeAboveSea < 20) {
    return { biome: 'BEACH_SAND', temperatureCelsius: 24 - 30 * latitudeNormalized };
  }

  // 3. Gradiente térmico (Lapse rate):
  // - 28°C en el ecuador, descendiendo hasta -15°C en los casquetes polares.
  // - Descenso adiabático de ~6.5°C por cada 1.000 metros de altitud.
  const baseTempAtSeaLevel = 28.0 - 43.0 * latitudeNormalized;
  const altitudeLapseRate = (altitudeAboveSea / 1000.0) * 6.5;
  const temperatureCelsius = baseTempAtSeaLevel - altitudeLapseRate;

  // 4. Glaciares y Cumbres Nevadas (casquetes polares perpetuos y picos alpinos altos)
  if (temperatureCelsius <= -9.0 || altitudeAboveSea > 3400) {
    return { biome: 'SNOW_PEAK', temperatureCelsius };
  }

  // 5. Tierras altas rocosas o frías de montaña
  if (altitudeAboveSea > 2200) {
    if (moisture > 0.45) {
      return { biome: 'BOREAL_TAIGA', temperatureCelsius };
    }
    return { biome: 'ROCKY_MOUNTAIN', temperatureCelsius };
  }

  // 6. Zonas frías y polares (-9°C <= T < 8°C)
  if (temperatureCelsius < 8.0) {
    if (moisture > 0.38) {
      return { biome: 'BOREAL_TAIGA', temperatureCelsius };
    }
    return { biome: 'TUNDRA', temperatureCelsius };
  }

  // 7. Zonas templadas (8°C <= T < 20°C)
  if (temperatureCelsius < 20.0) {
    if (moisture < 0.28) {
      return { biome: 'DESERT', temperatureCelsius }; // Estepa árida continental
    }
    if (moisture < 0.60) {
      return { biome: 'TEMPERATE_GRASSLAND', temperatureCelsius }; // Pradera
    }
    return { biome: 'TEMPERATE_FOREST', temperatureCelsius }; // Bosque templado húmedo
  }

  // 8. Zonas cálidas y tropicales (T >= 20°C)
  if (moisture < 0.28) {
    return { biome: 'DESERT', temperatureCelsius }; // Desierto cálido
  }
  if (moisture < 0.58) {
    return { biome: 'SAVANNA', temperatureCelsius }; // Sabana tropical
  }

  return { biome: 'TROPICAL_RAINFOREST', temperatureCelsius }; // Selva húmeda ecuatorial
}
