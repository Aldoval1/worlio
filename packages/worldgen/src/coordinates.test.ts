import { describe, it, expect } from 'vitest';
import { PlanetaryCoordinates } from './coordinates.js';

describe('PlanetaryCoordinates & Tangent Frames (T13)', () => {
  const planetRadius = 125000.0; // 125 km

  it('valida roundtrip esférico <-> cartesiano en el ecuador y meridianos cardinales', () => {
    const testPoints = [
      { latitudeRad: 0, longitudeRad: 0, altitudeMeters: 50 },
      { latitudeRad: 0, longitudeRad: Math.PI / 2, altitudeMeters: 100 },
      { latitudeRad: 0, longitudeRad: Math.PI, altitudeMeters: 0 },
      { latitudeRad: Math.PI / 4, longitudeRad: Math.PI / 4, altitudeMeters: 250 },
      { latitudeRad: -Math.PI / 4, longitudeRad: -Math.PI / 3, altitudeMeters: 500 }
    ];

    for (const pt of testPoints) {
      const cart = PlanetaryCoordinates.sphericalToCartesian(pt, planetRadius);
      const roundtrip = PlanetaryCoordinates.cartesianToSpherical(cart, planetRadius);

      expect(roundtrip.latitudeRad).toBeCloseTo(pt.latitudeRad, 6);
      expect(roundtrip.longitudeRad).toBeCloseTo(pt.longitudeRad, 6);
      expect(roundtrip.altitudeMeters).toBeCloseTo(pt.altitudeMeters, 4);
    }
  });

  it('maneja de forma estable y sin NaN los polos norte y sur (singularidad protegida)', () => {
    const northPole = { latitudeRad: Math.PI / 2, longitudeRad: 0, altitudeMeters: 0 };
    const southPole = { latitudeRad: -Math.PI / 2, longitudeRad: 0, altitudeMeters: 0 };

    const cartN = PlanetaryCoordinates.sphericalToCartesian(northPole, planetRadius);
    expect(cartN.x).toBeCloseTo(0);
    expect(cartN.y).toBeCloseTo(planetRadius);
    expect(cartN.z).toBeCloseTo(0);

    const basisN = PlanetaryCoordinates.computeTangentBasis(northPole.latitudeRad, 0);
    expect(Number.isFinite(basisN.east.x)).toBe(true);
    expect(Number.isFinite(basisN.north.y)).toBe(true);
    expect(Number.isFinite(basisN.up.y)).toBe(true);

    const cartS = PlanetaryCoordinates.sphericalToCartesian(southPole, planetRadius);
    expect(cartS.y).toBeCloseTo(-planetRadius);
  });

  it('invariante global -> local -> global preserva coordenadas con error sub-milimétrico', () => {
    const anchorSpherical = { latitudeRad: 0.35, longitudeRad: -0.72, altitudeMeters: 100 };
    const anchorGlobal = PlanetaryCoordinates.sphericalToCartesian(anchorSpherical, planetRadius);
    const anchorBasis = PlanetaryCoordinates.computeTangentBasis(
      anchorSpherical.latitudeRad,
      anchorSpherical.longitudeRad
    );

    // Punto situado a 250 metros al este y 150 metros al norte en la superficie
    const originalLocal = { x: 250.0, y: 5.0, z: 150.0 };
    const globalFromLocal = PlanetaryCoordinates.localTangentToGlobal(
      originalLocal,
      anchorGlobal,
      anchorBasis
    );

    const roundtripLocal = PlanetaryCoordinates.globalToLocalTangent(
      globalFromLocal,
      anchorGlobal,
      anchorBasis
    );

    expect(roundtripLocal.x).toBeCloseTo(originalLocal.x, 5);
    expect(roundtripLocal.y).toBeCloseTo(originalLocal.y, 5);
    expect(roundtripLocal.z).toBeCloseTo(originalLocal.z, 5);
  });

  it('demuestra precisión de Float32 local frente a pérdida de precisión en Float32 global a 125 km', () => {
    // A 125.000 metros, la resolución de un Float32 (24 bits de mantisa) es:
    // 125000 * 2^-23 ≈ 0.0149 metros (1.5 cm de jitter)
    const globalCoordFloat64 = 125000.12345;
    const globalCoordFloat32 = Math.fround(globalCoordFloat64);
    const globalError = Math.abs(globalCoordFloat64 - globalCoordFloat32);

    // En cambio, en marco local a 50 metros del ancla:
    const localCoordFloat64 = 50.12345;
    const localCoordFloat32 = Math.fround(localCoordFloat64);
    const localError = Math.abs(localCoordFloat64 - localCoordFloat32);

    // El error local es más de 1.000 veces menor
    expect(localError).toBeLessThan(globalError / 1000);
    expect(localError).toBeLessThan(0.0001); // Menor a 0.1 milímetros
  });
});
