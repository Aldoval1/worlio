import { describe, expect, it } from 'vitest';
import { CANONICAL_PLANETS, TerrainSampler } from '@universo/worldgen';
import {
  computeTerrainNormal,
  MIN_GROUND_CLEARANCE_METERS,
  queryGroundUnderPosition,
  resolveGroundCollision,
  slideAlongSlope
} from './groundCollision.js';
import { RtsCameraController } from './rtsCameraController.js';

describe('T18 — Navegación al suelo a 2m, colisión y deslizamiento en pendientes', () => {
  const planet = CANONICAL_PLANETS.TERRA_PRIME!;
  const R = planet.radiusMeters; // 125,000 m
  const sampler = new TerrainSampler(planet);

  describe('1. Consulta y detección de penetración en relieve (queryGroundUnderPosition)', () => {
    it('determina con precisión submétrica la altitud libre sobre el relieve procedural', () => {
      // Posición a lo largo del eje X
      const sample = sampler.sample(1, 0, 0);
      const groundRadius = R + sample.heightMeters;

      // Cámara a 15 metros sobre el suelo
      const camPos = { x: groundRadius + 15.0, y: 0, z: 0 };
      const query = queryGroundUnderPosition(camPos, sampler, R);

      expect(query.surfaceRadiusMeters).toBeCloseTo(groundRadius, 2);
      expect(query.clearanceMeters).toBeCloseTo(15.0, 2);
      expect(query.isPenetrating).toBe(false);
      expect(query.groundPoint.x).toBeCloseTo(groundRadius, 2);
    });

    it('marca isPenetrating = true si la cámara desciende a menos de 2 metros del suelo o penetra', () => {
      const sample = sampler.sample(0, 1, 0);
      const groundRadius = R + sample.heightMeters;

      // 1.8 m sobre el suelo (< 2.0 m)
      const camPosClose = { x: 0, y: groundRadius + 1.8, z: 0 };
      const queryClose = queryGroundUnderPosition(camPosClose, sampler, R);
      expect(queryClose.isPenetrating).toBe(true);

      // Subterránea (-5 m bajo el suelo)
      const camPosUnder = { x: 0, y: groundRadius - 5.0, z: 0 };
      const queryUnder = queryGroundUnderPosition(camPosUnder, sampler, R);
      expect(queryUnder.isPenetrating).toBe(true);
      expect(queryUnder.clearanceMeters).toBeCloseTo(-5.0, 2);
    });

    it('calcula una normal unitaria que apunta hacia el exterior de la superficie', () => {
      const normal = computeTerrainNormal(1, 0, 0, sampler, R);
      const len = Math.hypot(normal.x, normal.y, normal.z);
      expect(len).toBeCloseTo(1.0, 4);

      // El producto escalar con el vector radial (1,0,0) debe ser fuertemente positivo (apuntando hacia afuera)
      expect(normal.x).toBeGreaterThan(0.7);
    });
  });

  describe('2. Colisión física estricta y clamp a >= 2.0m (resolveGroundCollision)', () => {
    it('eleva la cámara si penetra el relieve garantizando clearance >= 2.0 m', () => {
      const sample = sampler.sample(0, 0, 1);
      const groundRadius = R + sample.heightMeters;

      // Intentar colocar la cámara 10 metros bajo tierra
      const undergroundPos = { x: 0, y: 0, z: groundRadius - 10.0 };
      const resolved = resolveGroundCollision(undergroundPos, sampler, R);

      const resolvedDist = Math.hypot(resolved.x, resolved.y, resolved.z);
      const resolvedClearance = resolvedDist - groundRadius;

      expect(resolvedClearance).toBeCloseTo(MIN_GROUND_CLEARANCE_METERS, 2);
      expect(resolved.z).toBeCloseTo(groundRadius + 2.0, 2);
    });

    it('mantiene intacta la posición si la cámara ya está por encima de los 2.0 m', () => {
      const sample = sampler.sample(0, 0, 1);
      const groundRadius = R + sample.heightMeters;

      const safePos = { x: 0, y: 0, z: groundRadius + 50.0 };
      const resolved = resolveGroundCollision(safePos, sampler, R);

      expect(resolved.x).toBe(safePos.x);
      expect(resolved.y).toBe(safePos.y);
      expect(resolved.z).toBe(safePos.z);
    });

    it('funciona de manera idéntica en crestas montañosas o fosas marinas', () => {
      // Probar en 4 direcciones diagonales del planeta con vectores normalizados
      const invSqrt3 = 1.0 / Math.sqrt(3.0);
      const directions: [number, number, number][] = [
        [invSqrt3, invSqrt3, invSqrt3],
        [-invSqrt3, invSqrt3, invSqrt3],
        [invSqrt3, -invSqrt3, invSqrt3],
        [-invSqrt3, -invSqrt3, -invSqrt3]
      ];

      for (const [ux, uy, uz] of directions) {
        const sample = sampler.sample(ux, uy, uz);
        const groundRadius = R + sample.heightMeters;

        // Intentar colocar a 0.5 m del relieve
        const posNear = {
          x: ux * (groundRadius + 0.5),
          y: uy * (groundRadius + 0.5),
          z: uz * (groundRadius + 0.5)
        };

        const resolved = resolveGroundCollision(posNear, sampler, R);
        const resolvedR = Math.hypot(resolved.x, resolved.y, resolved.z);
        expect(resolvedR - groundRadius).toBeCloseTo(2.0, 2);
      }
    });
  });

  describe('3. Deslizamiento en pendientes (slideAlongSlope)', () => {
    it('deflexiona tangencialmente la velocidad si penetra la pendiente (v . N < 0)', () => {
      // Normal de la pendiente: 45° entre X y Y
      const invSqrt2 = 1.0 / Math.SQRT2;
      const slopeNormal = { x: invSqrt2, y: invSqrt2, z: 0 };

      // Velocidad frontal intentando penetrar: (-10, 0, 0)
      const velIntoSlope = { x: -10, y: 0, z: 0 };
      const slided = slideAlongSlope(velIntoSlope, slopeNormal);

      // Producto escalar v' . N debe ser >= 0 (no penetra)
      const dot = slided.x * slopeNormal.x + slided.y * slopeNormal.y + slided.z * slopeNormal.z;
      expect(dot).toBeCloseTo(0.0, 4);

      // La componente tangencial se desliza a lo largo del plano
      expect(slided.y).toBeGreaterThan(0.0);
    });

    it('preserva la velocidad sin modificar si se mueve en paralelo o alejándose de la pendiente', () => {
      const slopeNormal = { x: 1, y: 0, z: 0 };
      const velAway = { x: 5, y: 10, z: 0 }; // v . N = 5 > 0

      const slided = slideAlongSlope(velAway, slopeNormal);
      expect(slided.x).toBe(5);
      expect(slided.y).toBe(10);
      expect(slided.z).toBe(0);
    });
  });

  describe('4. Controlador de Cámara RTS (RtsCameraController)', () => {
    // Mock ligero de Babylon Camera / Scene
    const createMockCamera = (initPos: { x: number; y: number; z: number }) => {
      return {
        position: {
          x: initPos.x,
          y: initPos.y,
          z: initPos.z,
          set(x: number, y: number, z: number) {
            this.x = x;
            this.y = y;
            this.z = z;
          }
        },
        upVector: { x: 0, y: 1, z: 0 },
        setTarget(_t: unknown) {}
      } as any;
    };

    it('recalcula la base ortonormal local y mantiene la orientación correcta', () => {
      const mockCam = createMockCamera({ x: R + 100, y: 0, z: 0 });
      const target = { x: R, y: 0, z: 0 };

      const controller = new RtsCameraController(
        null as any,
        mockCam,
        R,
        sampler,
        target,
        { defaultDistanceMeters: 50.0 }
      );

      const basis = controller.computeLocalBasis();
      expect(basis.up.x).toBeCloseTo(1.0, 3);
      expect(basis.up.y).toBeCloseTo(0.0, 3);
      expect(basis.up.z).toBeCloseTo(0.0, 3);

      // Up, Forward y Right deben ser ortonormales
      const dotUpFwd = basis.up.x * basis.forward.x + basis.up.y * basis.forward.y + basis.up.z * basis.forward.z;
      expect(dotUpFwd).toBeCloseTo(0.0, 4);
    });

    it('limita el picado vertical (Pitch clamp) entre 25° y 88° evitando vuelcos', () => {
      const mockCam = createMockCamera({ x: 0, y: R + 100, z: 0 });
      const controller = new RtsCameraController(
        null as any,
        mockCam,
        R,
        sampler,
        { x: 0, y: R, z: 0 }
      );

      // Intentar forzar pitch negativo (< 25°)
      controller.rotate(0, -Math.PI);
      expect(controller.pitchRadians).toBeCloseTo((25 * Math.PI) / 180, 4);

      // Intentar forzar pitch cenital excesivo (> 88°)
      controller.rotate(0, Math.PI);
      expect(controller.pitchRadians).toBeCloseTo((88 * Math.PI) / 180, 4);
    });

    it('ejecuta seguimiento continuo del contorno del relieve durante el paneo tangencial', () => {
      const mockCam = createMockCamera({ x: R + 50, y: 0, z: 0 });
      const controller = new RtsCameraController(
        null as any,
        mockCam,
        R,
        sampler,
        { x: R, y: 0, z: 0 },
        { basePanSpeedMetersPerSec: 100 }
      );

      // Pan hacia adelante
      controller.pan(1.0, 0.0, 0.1);

      const newR = Math.hypot(
        controller.targetGroundPoint.x,
        controller.targetGroundPoint.y,
        controller.targetGroundPoint.z
      );

      // El radio del target debe ser exactamente el radio del relieve en esa nueva posición
      const normX = controller.targetGroundPoint.x / newR;
      const normY = controller.targetGroundPoint.y / newR;
      const normZ = controller.targetGroundPoint.z / newR;
      const expectedH = sampler.sample(normX, normY, normZ).heightMeters;

      expect(newR).toBeCloseTo(R + expectedH, 1);
    });

    it('garantiza que la cámara en el suelo nunca baje de 2 m de altitud libre', () => {
      const mockCam = createMockCamera({ x: R + 50, y: 0, z: 0 });
      const controller = new RtsCameraController(
        null as any,
        mockCam,
        R,
        sampler,
        { x: R, y: 0, z: 0 },
        { minClearanceMeters: 2.0 }
      );

      // Hacer zoom excesivo hacia abajo
      controller.zoom(-1000.0);
      expect(controller.targetDistanceMeters).toBe(2.0);

      // Simular frame update
      controller.update(0.1);

      // La distancia de la cámara al suelo debe ser al menos 2.0 m
      const query = queryGroundUnderPosition(
        { x: mockCam.position.x, y: mockCam.position.y, z: mockCam.position.z },
        sampler,
        R
      );
      expect(query.clearanceMeters).toBeGreaterThanOrEqual(2.0 - 1e-4);
      expect(query.isPenetrating).toBe(false);
    });
  });
});
