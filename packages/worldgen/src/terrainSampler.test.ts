import { describe, it, expect } from 'vitest';
import { TerrainSampler } from './terrainSampler.js';
import { createPlanetId, type PlanetDefinition } from '@universo/shared';

describe('TerrainSampler (Generador Procedural Determinista)', () => {
  const planetA: PlanetDefinition = {
    planetId: createPlanetId('planet-alpha'),
    seed: 'SEED-ALPHA-1234',
    generatorVersion: 'v1.0.0',
    radiusMeters: 125000,
    seaLevelMeters: 0,
    terrain: {
      octaves: 6,
      persistence: 0.5,
      lacunarity: 2.0,
      heightScale: 4000
    }
  };

  const planetB: PlanetDefinition = {
    ...planetA,
    seed: 'SEED-BETA-9876'
  };

  it('produce muestreo determinista idéntico para la misma coordenada y seed', () => {
    const sampler1 = new TerrainSampler(planetA);
    const sampler2 = new TerrainSampler(planetA);

    const s1 = sampler1.sample(0, 1, 0);
    const s2 = sampler2.sample(0, 1, 0);

    expect(s1.heightMeters).toBe(s2.heightMeters);
    expect(s1.radiusAtPoint).toBe(s2.radiusAtPoint);
    expect(s1.isWater).toBe(s2.isWater);
    expect(s1.biome).toBe(s2.biome);
  });

  it('produce relieves diferenciados para distintas semillas', () => {
    const samplerA = new TerrainSampler(planetA);
    const samplerB = new TerrainSampler(planetB);

    const sA = samplerA.sample(0.5, 0.5, 0.7071);
    const sB = samplerB.sample(0.5, 0.5, 0.7071);

    expect(sA.heightMeters).not.toBe(sB.heightMeters);
  });

  it('mantiene radio siempre positivo y dentro de cotas físicas', () => {
    const sampler = new TerrainSampler(planetA);
    const points = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1]
    ];

    for (const [x, y, z] of points) {
      const s = sampler.sample(x!, y!, z!);
      expect(s.radiusAtPoint).toBeGreaterThan(100000);
      expect(s.radiusAtPoint).toBeLessThan(150000);
    }
  });
});
