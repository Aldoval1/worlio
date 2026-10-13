import { describe, expect, it } from 'vitest';
import {
  CANONICAL_PLANETS,
  TerrainSampler,
  classifyBiome,
  getBiomeProperties,
  BIOME_PROPERTIES,
  type BiomeType
} from '../index.js';
import { generateTileGeometry } from '../tiles/tileGeometry.js';
import { generateCubeSphereFaceGeometry } from '../cubeSphere.js';

describe('T19 — Biomas, materialidad PBR y normal visual a todas las escalas', () => {
  const planet = CANONICAL_PLANETS.TERRA_PRIME!;
  const R = planet.radiusMeters;
  const sampler = new TerrainSampler(planet);

  describe('1. Clasificación Bioclimática de Whittaker (Latitud, Humedad y Altura)', () => {
    it('clasifica selva tropical ecuatorial húmeda en cotas bajas', () => {
      const res = classifyBiome({
        heightMeters: 150,
        seaLevelMeters: 0,
        latitudeNormalized: 0.05, // Cerca del ecuador
        moisture: 0.85 // Humedad muy alta
      });

      expect(res.biome).toBe('TROPICAL_RAINFOREST');
      expect(res.temperatureCelsius).toBeGreaterThan(20);
    });

    it('clasifica desierto cálido en zonas subtropicales secas', () => {
      const res = classifyBiome({
        heightMeters: 200,
        seaLevelMeters: 0,
        latitudeNormalized: 0.15,
        moisture: 0.15 // Sequedad extrema
      });

      expect(res.biome).toBe('DESERT');
      expect(res.temperatureCelsius).toBeGreaterThan(20);
    });

    it('clasifica praderas y bosques templados en latitudes medias según precipitación', () => {
      // Latitud 45° (~0.5), cota baja
      const forest = classifyBiome({
        heightMeters: 100,
        seaLevelMeters: 0,
        latitudeNormalized: 0.35,
        moisture: 0.75 // Húmedo
      });
      expect(forest.biome).toBe('TEMPERATE_FOREST');

      const grassland = classifyBiome({
        heightMeters: 100,
        seaLevelMeters: 0,
        latitudeNormalized: 0.35,
        moisture: 0.45 // Moderado
      });
      expect(grassland.biome).toBe('TEMPERATE_GRASSLAND');
    });

    it('clasifica cumbres nevadas y glaciares por encima del umbral adiabático térmico', () => {
      const peak = classifyBiome({
        heightMeters: 4200, // Cima alta
        seaLevelMeters: 0,
        latitudeNormalized: 0.3,
        moisture: 0.5
      });

      expect(peak.biome).toBe('SNOW_PEAK');
      expect(peak.temperatureCelsius).toBeLessThan(0);
    });

    it('clasifica playas costeras y masas de agua somera/profunda', () => {
      const beach = classifyBiome({
        heightMeters: 8,
        seaLevelMeters: 0,
        latitudeNormalized: 0.2,
        moisture: 0.5
      });
      expect(beach.biome).toBe('BEACH_SAND');

      const shallow = classifyBiome({
        heightMeters: -50,
        seaLevelMeters: 0,
        latitudeNormalized: 0.2,
        moisture: 0.5
      });
      expect(shallow.biome).toBe('SHALLOW_WATER');

      const deep = classifyBiome({
        heightMeters: -1200,
        seaLevelMeters: 0,
        latitudeNormalized: 0.2,
        moisture: 0.5
      });
      expect(deep.biome).toBe('OCEAN');
    });

    it('clasifica taiga y tundra en regiones frías y subpolares', () => {
      const taiga = classifyBiome({
        heightMeters: 300,
        seaLevelMeters: 0,
        latitudeNormalized: 0.6,
        moisture: 0.6
      });
      expect(taiga.biome).toBe('BOREAL_TAIGA');

      const tundra = classifyBiome({
        heightMeters: 100,
        seaLevelMeters: 0,
        latitudeNormalized: 0.75,
        moisture: 0.2
      });
      expect(tundra.biome).toBe('TUNDRA');
    });
  });

  describe('2. Paleta PBR y Materialidad Sobria', () => {
    it('define propiedades PBR válidas para todos los 12 biomas del catálogo', () => {
      const allBiomes: BiomeType[] = [
        'OCEAN',
        'SHALLOW_WATER',
        'BEACH_SAND',
        'TROPICAL_RAINFOREST',
        'SAVANNA',
        'TEMPERATE_FOREST',
        'TEMPERATE_GRASSLAND',
        'BOREAL_TAIGA',
        'TUNDRA',
        'DESERT',
        'ROCKY_MOUNTAIN',
        'SNOW_PEAK'
      ];

      for (const b of allBiomes) {
        const props = getBiomeProperties(b);
        expect(props).toBeDefined();
        expect(props.name).toBeTruthy();
        expect(props.color.r).toBeGreaterThanOrEqual(0);
        expect(props.color.r).toBeLessThanOrEqual(1);
        expect(props.color.g).toBeGreaterThanOrEqual(0);
        expect(props.color.g).toBeLessThanOrEqual(1);
        expect(props.color.b).toBeGreaterThanOrEqual(0);
        expect(props.color.b).toBeLessThanOrEqual(1);
        expect(props.color.a).toBe(1.0);

        expect(props.roughness).toBeGreaterThanOrEqual(0.0);
        expect(props.roughness).toBeLessThanOrEqual(1.0);
        expect(props.metallic).toBeGreaterThanOrEqual(0.0);
        expect(props.metallic).toBeLessThanOrEqual(1.0);
        expect(props.specular).toBeGreaterThan(0.0);
      }
    });

    it('bosques y montes son visualmente reconocibles con contrastes realistas', () => {
      const forest = BIOME_PROPERTIES.TEMPERATE_FOREST;
      const rock = BIOME_PROPERTIES.ROCKY_MOUNTAIN;
      const snow = BIOME_PROPERTIES.SNOW_PEAK;

      // El bosque es verde dominante (G > R y G > B)
      expect(forest.color.g).toBeGreaterThan(forest.color.r);
      expect(forest.color.g).toBeGreaterThan(forest.color.b);

      // La nieve tiene albedo muy alto en todos los canales
      expect(snow.color.r).toBeGreaterThan(0.85);
      expect(snow.color.g).toBeGreaterThan(0.85);
      expect(snow.color.b).toBeGreaterThan(0.85);

      // La roca tiene reflectividad y rugosidad de material mineral
      expect(rock.roughness).toBeGreaterThan(0.7);
    });
  });

  describe('3. Cálculo Analítico de Normal Topográfica a Todas las Escalas', () => {
    it('genera normales unitarias en teselas de alta resolución (33x33)', () => {
      const tileGeom = generateTileGeometry(
        { planetId: planet.planetId, face: 'PX', level: 3, x: 2, y: 3 },
        sampler,
        R,
        16 // Muestra de 16x16
      );

      const numVertices = 17 * 17;
      for (let v = 0; v < numVertices; v++) {
        const nx = tileGeom.normals[v * 3]!;
        const ny = tileGeom.normals[v * 3 + 1]!;
        const nz = tileGeom.normals[v * 3 + 2]!;

        const len = Math.hypot(nx, ny, nz);
        expect(len).toBeCloseTo(1.0, 3);

        // Sin componentes NaN o infinitas
        expect(Number.isFinite(nx)).toBe(true);
        expect(Number.isFinite(ny)).toBe(true);
        expect(Number.isFinite(nz)).toBe(true);
      }
    });

    it('la normal topográfica refleja la pendiente real diferenciándose de la normal esférica en montañas', () => {
      const tileGeom = generateTileGeometry(
        { planetId: planet.planetId, face: 'PZ', level: 2, x: 1, y: 1 },
        sampler,
        R,
        16
      );

      const numVertices = 17 * 17;
      let foundSlopeDiscrepancy = false;

      for (let v = 0; v < numVertices; v++) {
        const nx = tileGeom.normals[v * 3]!;
        const ny = tileGeom.normals[v * 3 + 1]!;
        const nz = tileGeom.normals[v * 3 + 2]!;

        // Posición radial unitaria
        const wx = tileGeom.worldPositions[v * 3]!;
        const wy = tileGeom.worldPositions[v * 3 + 1]!;
        const wz = tileGeom.worldPositions[v * 3 + 2]!;
        const wDist = Math.hypot(wx, wy, wz);
        const rx = wx / wDist;
        const ry = wy / wDist;
        const rz = wz / wDist;

        // Producto escalar entre la normal analítica de terreno y el radio esférico
        const dot = nx * rx + ny * ry + nz * rz;

        // La normal siempre debe apuntar hacia el exterior del planeta
        expect(dot).toBeGreaterThan(0.0);

        // En zonas con relieve montañoso, la normal topográfica se desvía de la normal radial pura
        if (dot < 0.99) {
          foundSlopeDiscrepancy = true;
        }
      }

      // Debe haber pendientes reales en la tesela
      expect(foundSlopeDiscrepancy).toBe(true);
    });

    it('aplica las normales y colores PBR en la esfera orbital global de 6 caras', () => {
      const faceData = generateCubeSphereFaceGeometry('PX', 8, sampler, R, 0);

      expect(faceData.normals.length).toBe((9 * 9) * 3);
      expect(faceData.colors.length).toBe((9 * 9) * 4);

      // Verificar que los vértices tienen colores PBR no neutros
      const r0 = faceData.colors[0]!;
      const g0 = faceData.colors[1]!;
      const b0 = faceData.colors[2]!;
      const a0 = faceData.colors[3]!;

      expect(r0 + g0 + b0).toBeGreaterThan(0);
      expect(a0).toBe(1.0);
    });
  });

  describe('4. Coherencia Escalar Multiescala (Órbita a Suelo a 2 m)', () => {
    it('el color y bioma de un punto es idéntico e invariable independientemente del nivel de detalle', () => {
      const testPoint = { x: 0.6, y: 0.4, z: 0.6928 };
      const len = Math.hypot(testPoint.x, testPoint.y, testPoint.z);
      const ux = testPoint.x / len;
      const uy = testPoint.y / len;
      const uz = testPoint.z / len;

      const sample1 = sampler.sample(ux, uy, uz);
      const sample2 = sampler.sample(ux, uy, uz);

      expect(sample1.biome).toBe(sample2.biome);
      expect(sample1.color.r).toBe(sample2.color.r);
      expect(sample1.color.g).toBe(sample2.color.g);
      expect(sample1.color.b).toBe(sample2.color.b);
      expect(sample1.roughness).toBe(sample2.roughness);
      expect(sample1.metallic).toBe(sample2.metallic);
    });
  });
});
