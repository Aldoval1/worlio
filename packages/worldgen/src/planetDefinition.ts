import { createPlanetId, type PlanetDefinition } from '@universo/shared';

export const CURRENT_GENERATOR_VERSION = 'v1.0.0';

/**
 * Catálogo de planetas canónicos para pruebas y multiverso persistente
 */
export const CANONICAL_PLANETS: Record<string, PlanetDefinition> = {
  TERRA_PRIME: {
    planetId: createPlanetId('planet-terra-prime'),
    seed: 'UNIVERSO-TERRA-2026',
    generatorVersion: CURRENT_GENERATOR_VERSION,
    radiusMeters: 125000.0, // Diámetro conceptual 250 km
    seaLevelMeters: 0.0,
    terrain: {
      octaves: 6,
      persistence: 0.5,
      lacunarity: 2.0,
      heightScale: 4000.0
    }
  },

  ARES_DESERT: {
    planetId: createPlanetId('planet-ares-desert'),
    seed: 'UNIVERSO-ARES-2026',
    generatorVersion: CURRENT_GENERATOR_VERSION,
    radiusMeters: 110000.0, // Diámetro 220 km
    seaLevelMeters: -4000.0, // Planeta seco/árido sin océanos abiertos
    terrain: {
      octaves: 6,
      persistence: 0.55,
      lacunarity: 2.1,
      heightScale: 6000.0
    }
  },

  OCEANUS: {
    planetId: createPlanetId('planet-oceanus'),
    seed: 'UNIVERSO-OCEANUS-2026',
    generatorVersion: CURRENT_GENERATOR_VERSION,
    radiusMeters: 130000.0, // Diámetro 260 km
    seaLevelMeters: 1200.0, // Planeta oceánico con pequeños archipiélagos
    terrain: {
      octaves: 5,
      persistence: 0.45,
      lacunarity: 2.0,
      heightScale: 3000.0
    }
  }
};
