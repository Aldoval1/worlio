export type BiomeType =
  | 'OCEAN'
  | 'SHALLOW_WATER'
  | 'BEACH_SAND'
  | 'TROPICAL_RAINFOREST'
  | 'SAVANNA'
  | 'TEMPERATE_FOREST'
  | 'TEMPERATE_GRASSLAND'
  | 'BOREAL_TAIGA'
  | 'TUNDRA'
  | 'DESERT'
  | 'ROCKY_MOUNTAIN'
  | 'SNOW_PEAK';

export interface BiomeColorRgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface BiomeMaterialProperties {
  biome: BiomeType;
  name: string;
  color: BiomeColorRgba;
  roughness: number; // 0.0 (espejo) a 1.0 (rugoso)
  metallic: number; // 0.0 (dieléctrico) a 1.0 (metal)
  specular: number; // Factor de reflexión especular
}
