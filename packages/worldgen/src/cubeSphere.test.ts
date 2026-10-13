import { describe, it, expect } from 'vitest';
import {
  CUBE_FACES,
  cubeFaceToSphereDirection,
  generateCubeSphereFaceGeometry
} from './cubeSphere.js';
import { TerrainSampler } from './terrainSampler.js';
import { CANONICAL_PLANETS } from './planetDefinition.js';

describe('CubeSphere Topology & Geometry Generation (T12)', () => {
  const terra = CANONICAL_PLANETS['TERRA_PRIME']!;
  const sampler = new TerrainSampler(terra);

  it('proyecta direcciones radiales de norma unitaria para las 6 caras', () => {
    for (const face of CUBE_FACES) {
      const dCenter = cubeFaceToSphereDirection(face, 0, 0);
      expect(Math.hypot(dCenter.x, dCenter.y, dCenter.z)).toBeCloseTo(1.0);

      const dCorner = cubeFaceToSphereDirection(face, 1, 1);
      expect(Math.hypot(dCorner.x, dCorner.y, dCorner.z)).toBeCloseTo(1.0);
    }
  });

  it('genera mallas consistentes con recuento exacto de vértices e índices', () => {
    const subdivision = 8;
    const faceData = generateCubeSphereFaceGeometry(
      'PX',
      subdivision,
      sampler,
      terra.radiusMeters,
      terra.seaLevelMeters
    );

    // 8x8 quads -> 9x9 = 81 vértices
    expect(faceData.vertexCount).toBe(81);
    // 8 * 8 * 6 = 384 índices (128 triángulos)
    expect(faceData.indices.length).toBe(384);
    expect(faceData.triangleCount).toBe(128);
    expect(faceData.positions.length).toBe(81 * 3);
    expect(faceData.colors.length).toBe(81 * 4);
  });

  it('coincide de forma continua en aristas compartidas entre caras adyacentes', () => {
    // Probar borde entre cara PX y PY:
    // En cara PX: u = 0, v = -1 (borde hacia +Y, donde X=1, Y=1, Z=0)
    // En cara PY: u = 1, v = 0 (borde hacia +X, donde X=1, Y=1, Z=0)
    const d1 = cubeFaceToSphereDirection('PX', 0.0, -1.0);
    const d2 = cubeFaceToSphereDirection('PY', 1.0, 0.0);

    // Ambos puntos deben coincidir exactamente en la esfera unitaria
    expect(d1.x).toBeCloseTo(d2.x, 5);
    expect(d1.y).toBeCloseTo(d2.y, 5);
    expect(d1.z).toBeCloseTo(d2.z, 5);
  });

  it('genera concha oceánica al nivel del mar sin valores negativos de radio', () => {
    const faceData = generateCubeSphereFaceGeometry(
      'PZ',
      4,
      sampler,
      terra.radiusMeters,
      terra.seaLevelMeters
    );

    for (let i = 0; i < faceData.oceanPositions.length; i += 3) {
      const x = faceData.oceanPositions[i]!;
      const y = faceData.oceanPositions[i + 1]!;
      const z = faceData.oceanPositions[i + 2]!;
      const r = Math.hypot(x, y, z);
      expect(r).toBeCloseTo(terra.radiusMeters, 1);
    }
  });
});
