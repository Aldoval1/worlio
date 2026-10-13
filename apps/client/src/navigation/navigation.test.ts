import { describe, expect, it } from 'vitest';
import { CANONICAL_PLANETS, TerrainSampler } from '@universo/worldgen';
import {
  applyCursorAnchoredZoom,
  intersectRayWithPlanetSphere,
  refineIntersectionWithTerrain
} from './anchorPicking.js';
import {
  calculateFreeAltitude,
  calculateZoomDelta,
  clampAltitude,
  smoothDamp,
  type DampVelocity
} from './zoomMath.js';

describe('T16 — Navegación de cámara Cesium-feel, picking de región y zoom logarítmico', () => {
  const planet = CANONICAL_PLANETS.TERRA_PRIME!;
  const R = planet.radiusMeters; // 125,000 m

  describe('1. Zoom Logarítmico Proporcional a la Altura Libre (zoomMath)', () => {
    it('calcula la altitud libre sobre la superficie real', () => {
      const camPos = { x: R + 50000, y: 0, z: 0 };
      const altGround = calculateFreeAltitude(camPos, R, 0.0);
      expect(altGround).toBe(50000);

      // Con montaña de 3.000 m
      const altMountain = calculateFreeAltitude(camPos, R, 3000.0);
      expect(altMountain).toBe(47000);
    });

    it('escala la velocidad de zoom en más de 3 órdenes de magnitud entre órbita y suelo', () => {
      const wheelTick = 100.0;

      const deltaOrbital = calculateZoomDelta(300000, wheelTick); // 300 km en el espacio
      const deltaRegional = calculateZoomDelta(10000, wheelTick); // 10 km
      const deltaGround = calculateZoomDelta(50, wheelTick); // 50 m sobre el suelo

      expect(deltaOrbital).toBeGreaterThan(deltaRegional * 20);
      expect(deltaRegional).toBeGreaterThan(deltaGround * 50);

      // En el suelo el avance debe ser milimétrico/métrico para evitar atravesar el terreno
      expect(deltaGround).toBeLessThan(15.0);
    });

    it('limita la altitud impidiendo atravesar el terreno (< 2 m) o perderse en el espacio', () => {
      expect(clampAltitude(-50.0)).toBe(2.0); // No colisiona bajo tierra
      expect(clampAltitude(1.0)).toBe(2.0);
      expect(clampAltitude(500.0)).toBe(500.0);
      expect(clampAltitude(2_000_000.0)).toBe(1_500_000.0); // Techo espacial
    });

    it('suaviza la transición de forma estable e independiente del framerate (60 Hz vs 144 Hz)', () => {
      const vel60: DampVelocity = { value: 0 };
      const vel144: DampVelocity = { value: 0 };

      let val60 = 0.0;
      let val144 = 0.0;
      const target = 100.0;
      const smoothTime = 0.1;

      // Simular 0.2 segundos a 60 Hz (12 frames x ~16.6 ms)
      for (let i = 0; i < 12; i++) {
        val60 = smoothDamp(val60, target, vel60, smoothTime, 1 / 60);
      }

      // Simular 0.2 segundos a 144 Hz (29 frames x ~6.9 ms)
      for (let i = 0; i < 29; i++) {
        val144 = smoothDamp(val144, target, vel144, smoothTime, 1 / 144);
      }

      // Ambos deben converger prácticamente al mismo valor (diferencia < 1%)
      expect(val60).toBeGreaterThan(80.0);
      expect(val144).toBeGreaterThan(80.0);
      expect(Math.abs(val60 - val144)).toBeLessThan(2.0);
    });
  });

  describe('2. Ray Picking Analítico y Refinamiento de Relieve (anchorPicking)', () => {
    it('detecta intersección exacta sobre la esfera planetaria', () => {
      const rayOrigin = { x: 300000, y: 0, z: 0 };
      const rayDirection = { x: -1, y: 0, z: 0 }; // Apuntando al centro

      const hit = intersectRayWithPlanetSphere(rayOrigin, rayDirection, R);

      expect(hit.hit).toBe(true);
      expect(hit.distance).toBeCloseTo(300000 - R);
      expect(hit.point.x).toBeCloseTo(R);
      expect(hit.point.y).toBeCloseTo(0);
      expect(hit.point.z).toBeCloseTo(0);
    });

    it('retorna hit false cuando el rayo apunta al espacio exterior sin tocar el horizonte', () => {
      const rayOrigin = { x: 300000, y: 0, z: 0 };
      const rayDirection = { x: 0, y: 1, z: 0 }; // Tangente hacia el espacio

      const hit = intersectRayWithPlanetSphere(rayOrigin, rayDirection, R);
      expect(hit.hit).toBe(false);
    });

    it('refina la intersección sobre el relieve procedural con TerrainSampler', () => {
      const sampler = new TerrainSampler(planet);
      const rayOrigin = { x: 200000, y: 0, z: 0 };
      const rayDirection = { x: -1, y: 0, z: 0 };
      const approxHit = { x: R, y: 0, z: 0 };

      const refined = refineIntersectionWithTerrain(rayOrigin, rayDirection, approxHit, sampler, R);

      const r = Math.hypot(refined.x, refined.y, refined.z);
      const sample = sampler.sample(refined.x / r, refined.y / r, refined.z / r);
      const expectedRadius = R + sample.heightMeters;

      expect(r).toBeCloseTo(expectedRadius, 1);
    });

    it('mantiene el anclaje del cursor bajo la cámara durante el zoom proyectado', () => {
      const anchor = { x: R, y: 0, z: 0 };
      const camPos = { x: R + 10000, y: 0, z: 0 }; // 10 km sobre el ancla

      const zoomStep = 2000; // Avanzar 2 km
      const result = applyCursorAnchoredZoom(camPos, anchor, zoomStep, R, 2.0);

      // La cámara debe estar ahora a 8 km del ancla
      const newDist = Math.hypot(result.newCameraPos.x - anchor.x, result.newCameraPos.y - anchor.y, result.newCameraPos.z - anchor.z);
      expect(newDist).toBeCloseTo(8000, 1);
      expect(result.newAltitude).toBeCloseTo(8000, 1);

      // Zoom excesivo que sobrepase el suelo debe respetar la altitud mínima (2 m)
      const bigZoom = applyCursorAnchoredZoom(camPos, anchor, 20000, R, 2.0);
      expect(bigZoom.newAltitude).toBe(2.0);
    });
  });
});
