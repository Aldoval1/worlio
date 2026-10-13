import type { BiomeMaterialProperties, BiomeType } from './types.js';

export const BIOME_PROPERTIES: Record<BiomeType, BiomeMaterialProperties> = {
  OCEAN: {
    biome: 'OCEAN',
    name: 'Océano Profundo',
    color: { r: 0.043, g: 0.114, b: 0.239, a: 1.0 }, // #0B1D3D Azul abisal
    roughness: 0.1,
    metallic: 0.0,
    specular: 0.6
  },
  SHALLOW_WATER: {
    biome: 'SHALLOW_WATER',
    name: 'Aguas Costeras',
    color: { r: 0.082, g: 0.322, b: 0.459, a: 1.0 }, // #155275 Turquesa marino
    roughness: 0.15,
    metallic: 0.0,
    specular: 0.5
  },
  BEACH_SAND: {
    biome: 'BEACH_SAND',
    name: 'Playa Costera',
    color: { r: 0.761, g: 0.698, b: 0.529, a: 1.0 }, // #C2B287 Arena cálida
    roughness: 0.85,
    metallic: 0.0,
    specular: 0.1
  },
  TROPICAL_RAINFOREST: {
    biome: 'TROPICAL_RAINFOREST',
    name: 'Selva Tropical',
    color: { r: 0.118, g: 0.278, b: 0.102, a: 1.0 }, // #1E471A Verde húmedo profundo
    roughness: 0.75,
    metallic: 0.0,
    specular: 0.15
  },
  SAVANNA: {
    biome: 'SAVANNA',
    name: 'Sabana Árida',
    color: { r: 0.620, g: 0.557, b: 0.318, a: 1.0 }, // #9E8E51 Ocre-herbáceo
    roughness: 0.8,
    metallic: 0.0,
    specular: 0.1
  },
  TEMPERATE_FOREST: {
    biome: 'TEMPERATE_FOREST',
    name: 'Bosque Templado',
    color: { r: 0.176, g: 0.353, b: 0.157, a: 1.0 }, // #2D5A28 Verde bosque intenso
    roughness: 0.72,
    metallic: 0.0,
    specular: 0.15
  },
  TEMPERATE_GRASSLAND: {
    biome: 'TEMPERATE_GRASSLAND',
    name: 'Pradera Templada',
    color: { r: 0.314, g: 0.478, b: 0.204, a: 1.0 }, // #507A34 Verde pradera
    roughness: 0.68,
    metallic: 0.0,
    specular: 0.12
  },
  BOREAL_TAIGA: {
    biome: 'BOREAL_TAIGA',
    name: 'Taiga Boreal',
    color: { r: 0.157, g: 0.259, b: 0.204, a: 1.0 }, // #284234 Coníferas grisáceas
    roughness: 0.78,
    metallic: 0.0,
    specular: 0.12
  },
  TUNDRA: {
    biome: 'TUNDRA',
    name: 'Tundra Polar',
    color: { r: 0.424, g: 0.439, b: 0.337, a: 1.0 }, // #6C7056 Musgo frío
    roughness: 0.82,
    metallic: 0.0,
    specular: 0.1
  },
  DESERT: {
    biome: 'DESERT',
    name: 'Desierto de Dunas',
    color: { r: 0.824, g: 0.678, b: 0.443, a: 1.0 }, // #D2AD71 Arena rojiza-dorada
    roughness: 0.88,
    metallic: 0.0,
    specular: 0.1
  },
  ROCKY_MOUNTAIN: {
    biome: 'ROCKY_MOUNTAIN',
    name: 'Monte Rocoso',
    color: { r: 0.380, g: 0.361, b: 0.349, a: 1.0 }, // #615C59 Granito / caliza gris
    roughness: 0.85,
    metallic: 0.05,
    specular: 0.2
  },
  SNOW_PEAK: {
    biome: 'SNOW_PEAK',
    name: 'Cumbre Helada',
    color: { r: 0.922, g: 0.941, b: 0.961, a: 1.0 }, // #EBEFF5 Nieve perpetua
    roughness: 0.35,
    metallic: 0.0,
    specular: 0.4
  }
};

export function getBiomeProperties(biome: BiomeType): BiomeMaterialProperties {
  return BIOME_PROPERTIES[biome] ?? BIOME_PROPERTIES.TEMPERATE_GRASSLAND;
}
