import { DeterministicNoise3D } from './noise3d.js';
import type { PlanetDefinition } from '@universo/shared';
import {
  classifyBiome,
  getBiomeProperties,
  type BiomeColorRgba,
  type BiomeType
} from './biomes/index.js';

export interface TerrainSampleResult {
  heightMeters: number;
  radiusAtPoint: number;
  isWater: boolean;
  biome: BiomeType;
  temperatureCelsius: number;
  moisture: number;
  color: BiomeColorRgba;
  roughness: number;
  metallic: number;
}

export class TerrainSampler {
  private continentalNoise: DeterministicNoise3D;
  private mountainNoise: DeterministicNoise3D;
  private detailNoise: DeterministicNoise3D;
  private moistureNoise: DeterministicNoise3D;
  private planet: PlanetDefinition;

  constructor(planet: PlanetDefinition) {
    this.planet = planet;
    this.continentalNoise = new DeterministicNoise3D(
      `${planet.seed}_continents_${planet.generatorVersion}`
    );
    this.mountainNoise = new DeterministicNoise3D(
      `${planet.seed}_mountains_${planet.generatorVersion}`
    );
    this.detailNoise = new DeterministicNoise3D(
      `${planet.seed}_detail_${planet.generatorVersion}`
    );
    this.moistureNoise = new DeterministicNoise3D(
      `${planet.seed}_moisture_${planet.generatorVersion}`
    );
  }

  /**
   * Muestreo completo de elevación, bioma de Whittaker y propiedades PBR (albedo, roughness, metallic)
   * para un vector radial normalizado (dx, dy, dz).
   */
  public sample(dx: number, dy: number, dz: number): TerrainSampleResult {
    // 1. Capa continental a escala global (frecuencia baja)
    const continents = this.continentalNoise.fbm(dx * 2.0, dy * 2.0, dz * 2.0, 4, 2.0, 0.5);

    // 2. Capa montañosa y valles
    const mountains = this.mountainNoise.fbm(dx * 8.0, dy * 8.0, dz * 8.0, 5, 2.0, 0.45);

    // 3. Detalle fino del relieve
    const detail = this.detailNoise.fbm(dx * 24.0, dy * 24.0, dz * 24.0, 3, 2.0, 0.5);

    // 4. Combinación determinista de elevación
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

    // 5. Muestreo de humedad determinista y latitud
    const rawMoisture = this.moistureNoise.fbm(dx * 3.0, dy * 3.0, dz * 3.0, 4, 2.0, 0.5);
    // Efecto orográfico: mayor humedad cerca del nivel del mar / valles
    const moistureBonus = isWater ? 0.3 : Math.max(0.0, 0.2 - heightMeters / 15000.0);
    const moisture = Math.max(0.0, Math.min(1.0, rawMoisture + moistureBonus));

    const latitudeNormalized = Math.min(1.0, Math.abs(dy));

    // 6. Clasificación de bioma según el modelo de Whittaker
    const { biome, temperatureCelsius } = classifyBiome({
      heightMeters,
      seaLevelMeters: this.planet.seaLevelMeters,
      latitudeNormalized,
      moisture
    });

    // 7. Propiedades de materialidad PBR (albedo, rugosidad, metalicidad)
    const matProps = getBiomeProperties(biome);

    return {
      heightMeters,
      radiusAtPoint,
      isWater,
      biome,
      temperatureCelsius,
      moisture,
      color: matProps.color,
      roughness: matProps.roughness,
      metallic: matProps.metallic
    };
  }
}
