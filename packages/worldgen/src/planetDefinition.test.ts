import { describe, it, expect } from 'vitest';
import { TerrainSampler } from './terrainSampler.js';
import { CANONICAL_PLANETS } from './planetDefinition.js';

describe('Canonical Planets & Terrain Continuity (T11)', () => {
  const terra = CANONICAL_PLANETS['TERRA_PRIME']!;
  const ares = CANONICAL_PLANETS['ARES_DESERT']!;
  const oceanus = CANONICAL_PLANETS['OCEANUS']!;

  it('valida que los tres planetas canónicos tienen radios y propiedades coherentes', () => {
    expect(terra.radiusMeters).toBe(125000);
    expect(ares.radiusMeters).toBe(110000);
    expect(oceanus.radiusMeters).toBe(130000);
  });

  it('garantiza orden de muestreo invariable (order independence)', () => {
    const sampler = new TerrainSampler(terra);

    const pA = { x: 0.5773, y: 0.5773, z: 0.5773 };
    const pB = { x: -0.7071, y: 0.7071, z: 0 };

    // Muestrear A luego B
    const a1 = sampler.sample(pA.x, pA.y, pA.z);
    const b1 = sampler.sample(pB.x, pB.y, pB.z);

    // Muestrear B luego A
    const b2 = sampler.sample(pB.x, pB.y, pB.z);
    const a2 = sampler.sample(pA.x, pA.y, pA.z);

    expect(a1.heightMeters).toBe(a2.heightMeters);
    expect(b1.heightMeters).toBe(b2.heightMeters);
  });

  it('garantiza continuidad C0 en vecindades de polos y esquinas de cube-sphere', () => {
    const sampler = new TerrainSampler(terra);

    // Polo norte (0, 1, 0) y un punto a una distancia infinitesimal
    const pole = sampler.sample(0, 1, 0);
    const nearPole = sampler.sample(0.0001, 0.99999999, 0);

    // La variación de altura en un ángulo de ~0.0001 radianes debe ser menor a 50 metros
    const diff = Math.abs(pole.heightMeters - nearPole.heightMeters);
    expect(diff).toBeLessThan(50);
  });

  it('clasifica Ares como planeta mayoritariamente seco y Oceanus con alta presencia de agua', () => {
    const samplerAres = new TerrainSampler(ares);
    const samplerOceanus = new TerrainSampler(oceanus);

    let waterPointsAres = 0;
    let waterPointsOceanus = 0;
    const testPoints = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
      [0.577, 0.577, 0.577],
      [-0.577, 0.577, 0.577]
    ];

    for (const [x, y, z] of testPoints) {
      if (samplerAres.sample(x!, y!, z!).isWater) waterPointsAres++;
      if (samplerOceanus.sample(x!, y!, z!).isWater) waterPointsOceanus++;
    }

    // Ares tiene nivel del mar a -4000m, no debe tener agua en puntos altos
    expect(waterPointsAres).toBeLessThan(waterPointsOceanus);
    // Oceanus tiene nivel del mar a +1200m, debe tener abundante agua
    expect(waterPointsOceanus).toBeGreaterThan(0);
  });
});
