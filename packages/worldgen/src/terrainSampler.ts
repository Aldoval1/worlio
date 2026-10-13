import { DeterministicNoise3D } from './noise3d.js';
import type { PlanetDefinition } from '@universo/shared';

export interface TerrainSampleResult {
  heightMeters: number;
  radiusAtPoint: number;
  isWater: boolean;
  biome: string;
}

export class TerrainSampler {
  private continentalNoise: DeterministicNoise3D;
  private mountainNoise: DeterministicNoise3D;
  private detailNoise: DeterministicNoise3D;
  private planet: PlanetDefinition;

  constructor(planet: PlanetDefinition) {
    this.planet = planet;
    this.continentalNoise = new DeterministicNoise3D(
      `${planet.seed}_continents_${planet.generatorVersion}`
    );
    this.mountainNoise = new DeterministicNoise3D(
      `${planet.seed}_mountains_${planet.generatorVersion}`
    );
    this.detailNoise = new DeterministicNoise3D(`${planet.seed}_detail_${planet.generatorVersion}`);
  }

  /**
   * Muestreo puro de elevación del terreno para un vector unitario normalizado (dx, dy, dz)
   */
  public sample(dx: number, dy: number, dz: number): TerrainSampleResult {
    // 1. Capa continental a escala global (frecuencia baja)
    const continents = this.continentalNoise.fbm(dx * 2.0, dy * 2.0, dz * 2.0, 4, 2.0, 0.5);

    // 2. Capa montañosa y valles
    const mountains = this.mountainNoise.fbm(dx * 8.0, dy * 8.0, dz * 8.0, 5, 2.0, 0.45);

    // 3. Detalle fino del relieve
    const detail = this.detailNoise.fbm(dx * 24.0, dy * 24.0, dz * 24.0, 3, 2.0, 0.5);

    // Combinación determinista acotada
    // Altura base: escala entre -3.000m (fosas) y +4.500m (cordilleras)
    let rawHeight = (continents - 0.45) * 5000;
    if (rawHeight > 0) {
      rawHeight += Math.pow(mountains, 2) * 3500 + detail * 400;
    } else {
      rawHeight += detail * 200;
    }

    const heightMeters = Math.max(-6000, Math.min(8000, rawHeight));
    const radiusAtPoint = this.planet.radiusMeters + heightMeters;
    const isWater = heightMeters <= this.planet.seaLevelMeters;

    // Clasificación de bioma simplificada
    let biome = 'OCEAN';
    if (!isWater) {
      if (heightMeters > 3000) biome = 'SNOW_PEAK';
      else if (heightMeters > 1500) biome = 'ROCKY_MOUNTAIN';
      else if (Math.abs(dy) > 0.75) biome = 'TUNDRA';
      else if (Math.abs(dy) < 0.25 && mountains < 0.3) biome = 'DESERT';
      else biome = 'TEMPERATE_PLAINS';
    }

    return {
      heightMeters,
      radiusAtPoint,
      isWater,
      biome
    };
  }
}
