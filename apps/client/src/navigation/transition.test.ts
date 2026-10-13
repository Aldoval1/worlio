import { NullEngine, Scene } from '@babylonjs/core';
import { describe, expect, it } from 'vitest';
import {
  ATMOSPHERE_GROUND_ALTITUDE_METERS,
  ATMOSPHERE_TOP_ALTITUDE_METERS,
  calculateAtmosphereDensity,
  calculateAtmosphereSkyColor,
  calculateAtmosphericFogRange,
  evaluateAtmosphere,
  GROUND_SKY_COLOR,
  smoothstep,
  SPACE_COLOR
} from './atmosphereFog.js';
import { TransitionCoordinator } from './transitionCoordinator.js';

describe('T17 — Transición orbital-regional, horizonte físico y cuaterniones', () => {
  const planetRadiusMeters = 125_000.0; // 125 km (diámetro 250 km)

  describe('1. Modelo Atmosférico y Densidad por Altura (atmosphereFog)', () => {
    it('genera densidad 0.0 en el espacio y 1.0 en superficie con curva suave Hermite', () => {
      expect(calculateAtmosphereDensity(150_000)).toBe(0.0); // Espacio profundo
      expect(calculateAtmosphereDensity(ATMOSPHERE_TOP_ALTITUDE_METERS)).toBe(0.0); // 80 km exactos

      // Nivel del suelo
      expect(calculateAtmosphereDensity(ATMOSPHERE_GROUND_ALTITUDE_METERS)).toBe(1.0); // 2 km
      expect(calculateAtmosphereDensity(50)).toBe(1.0); // 50 m

      // Altitud intermedia (~41 km)
      const midDensity = calculateAtmosphereDensity(41_000);
      expect(midDensity).toBeGreaterThan(0.3);
      expect(midDensity).toBeLessThan(0.7);
    });

    it('interpola suavemente el color del cielo entre negro cósmico y azul diurno', () => {
      const colorSpace = calculateAtmosphereSkyColor(0.0);
      expect(colorSpace.r).toBeCloseTo(SPACE_COLOR.r);
      expect(colorSpace.g).toBeCloseTo(SPACE_COLOR.g);
      expect(colorSpace.b).toBeCloseTo(SPACE_COLOR.b);

      const colorGround = calculateAtmosphereSkyColor(1.0);
      expect(colorGround.r).toBeCloseTo(GROUND_SKY_COLOR.r);
      expect(colorGround.g).toBeCloseTo(GROUND_SKY_COLOR.g);
      expect(colorGround.b).toBeCloseTo(GROUND_SKY_COLOR.b);
    });

    it('calcula planos de niebla adaptados al horizonte visible en superficie', () => {
      // En órbita la niebla está desactivada (distancias enormes)
      const fogOrbit = calculateAtmosphericFogRange(100_000, planetRadiusMeters);
      expect(fogOrbit.fogStart).toBeGreaterThan(1e8);

      // En superficie (500 m de altitud), el horizonte físico d = sqrt(2*R*h) ~ 11.180 m
      const fogGround = calculateAtmosphericFogRange(500, planetRadiusMeters);
      expect(fogGround.fogStart).toBeGreaterThan(1_000);
      expect(fogGround.fogEnd).toBeGreaterThan(fogGround.fogStart);
      expect(fogGround.fogEnd).toBeLessThan(30_000); // Oculta la curvatura en el horizonte
    });

    it('evalúa los parámetros atmosféricos completos de forma determinista', () => {
      const atmo = evaluateAtmosphere(10_000, planetRadiusMeters);
      expect(atmo.density).toBeGreaterThan(0.8);
      expect(atmo.skyColor.a).toBe(1.0);
      expect(atmo.fogEndMeters).toBeGreaterThan(atmo.fogStartMeters);
    });
  });

  describe('2. Planos de Corte Adaptativos y Prevención de Z-Fighting', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const coordinator = new TransitionCoordinator(scene, planetRadiusMeters);

    it('calcula near/far adaptativos manteniendo relación de profundidad < 10^7 en todo el recorrido', () => {
      const altitudes = [500_000, 80_000, 20_000, 5_000, 500, 50, 2];

      for (const alt of altitudes) {
        const { near, far } = coordinator.calculateClippingPlanes(alt);

        // Near plane respeta límites
        expect(near).toBeGreaterThanOrEqual(0.1);
        expect(near).toBeLessThanOrEqual(500.0);

        // Far plane siempre supera el horizonte
        expect(far).toBeGreaterThan(near);

        // Ratio de precisión de búfer Float32 para prevenir z-fighting
        const depthRatio = far / near;
        expect(depthRatio).toBeLessThan(1e7);
      }
    });
  });

  describe('3. Continuidad de Cuaterniones sin Saltos de Escena', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const coordinator = new TransitionCoordinator(scene, planetRadiusMeters);

    it('genera cuaterniones normalizados y continuos en Slerp (t = 0.0 -> 0.5 -> 1.0)', () => {
      const cameraPos = { x: planetRadiusMeters + 10_000, y: 5_000, z: 0 };
      const target = { x: planetRadiusMeters, y: 0, z: 0 };

      const qOrbit = coordinator.computeInterpolatedOrientation(cameraPos, target, 0.0);
      const qMid = coordinator.computeInterpolatedOrientation(cameraPos, target, 0.5);
      const qGround = coordinator.computeInterpolatedOrientation(cameraPos, target, 1.0);

      // Todos los cuaterniones deben ser unitarios
      expect(qOrbit.length()).toBeCloseTo(1.0, 5);
      expect(qMid.length()).toBeCloseTo(1.0, 5);
      expect(qGround.length()).toBeCloseTo(1.0, 5);

      // Transición intermedia debe ser distinta de ambos extremos sin singularidad
      expect(qMid.x).not.toBe(qOrbit.x);
      expect(qMid.x).not.toBe(qGround.x);
    });

    it('función smoothstep es estrictamente monotónica y acotada en [0, 1]', () => {
      expect(smoothstep(0, 1, -0.5)).toBe(0.0);
      expect(smoothstep(0, 1, 0.0)).toBe(0.0);
      expect(smoothstep(0, 1, 0.5)).toBe(0.5);
      expect(smoothstep(0, 1, 1.0)).toBe(1.0);
      expect(smoothstep(0, 1, 1.5)).toBe(1.0);
    });
  });
});
