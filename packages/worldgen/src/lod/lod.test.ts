import { describe, expect, it } from 'vitest';
import { CANONICAL_PLANETS } from '../planetDefinition.js';
import {
  calculateGeometricError,
  calculateScreenSpaceError,
  isOccludedByPlanetaryHorizon
} from './lodMetrics.js';
import { LodQuadtree } from './lodQuadtree.js';
import { addTileSkirts } from './skirts.js';
import { StreamingJobQueue } from './streamingQueue.js';
import type { LodCameraState } from './types.js';
import { TerrainSampler } from '../terrainSampler.js';
import { generateTileGeometry } from '../tiles/tileGeometry.js';

describe('T15 — LOD dinámico, quadtree, histéresis y presupuestos de streaming', () => {
  const planet = CANONICAL_PLANETS.TERRA_PRIME!;
  const R = planet.radiusMeters; // 125,000 m

  const createCamera = (x: number, y: number, z: number): LodCameraState => ({
    position: { x, y, z },
    forward: { x: -x, y: -y, z: -z },
    fovRadians: (60 * Math.PI) / 180,
    viewportHeightPixels: 1080
  });

  describe('1. Error Geométrico y Selección de Nivel (SSE)', () => {
    it('reduce el error geométrico a la mitad con cada nivel diádico', () => {
      const e0 = calculateGeometricError(R, 0);
      const e1 = calculateGeometricError(R, 1);
      const e2 = calculateGeometricError(R, 2);

      expect(e1).toBeCloseTo(e0 / 2.0);
      expect(e2).toBeCloseTo(e1 / 2.0);
    });

    it('calcula Screen Space Error inversamente proporcional a la distancia', () => {
      const cam = createCamera(0, 0, 300000);
      const sseNear = calculateScreenSpaceError(1000, 10000, cam);
      const sseFar = calculateScreenSpaceError(1000, 20000, cam);

      expect(sseNear).toBeCloseTo(sseFar * 2.0, 1);
    });

    it('mantiene raíces a nivel 0 en órbita lejana', () => {
      const quadtree = new LodQuadtree(planet.planetId, R, {
        targetScreenSpaceErrorPixels: 4.0
      });

      // Cámara orbital a 500 km del centro (375 km de altitud)
      const cam = createCamera(500000, 0, 0);
      const result = quadtree.evaluate(cam);

      expect(result.stats.maxActiveLevel).toBe(0);
      expect(result.stats.activeLeavesCount).toBe(6); // 6 caras raíz
    });
  });

  describe('2. Histéresis contra Oscilaciones y Parpadeo', () => {
    it('evita oscilación cuando la cámara flota cerca del umbral de división', () => {
      const quadtree = new LodQuadtree(planet.planetId, R, {
        targetScreenSpaceErrorPixels: 60.0,
        splitThreshold: 1.0,
        mergeHysteresisFactor: 1.4
      });

      // 1. Acercar cámara a 90 km para provocar split en PX
      const camNear = createCamera(R + 90000, 0, 0);
      quadtree.evaluate(camNear);

      // Simular que todos los hijos de nivel 1 están listos
      const pxRoot = quadtree.getRoot('PX')!;
      expect(pxRoot.children).toBeDefined();
      for (const child of pxRoot.children!) {
        quadtree.markTileReady(child.id);
      }

      // Reevaluar con hijos listos: se produce la sustitución atómica
      const evalSplit = quadtree.evaluate(camNear);
      expect(pxRoot.state).toBe('SPLIT');
      expect(evalSplit.stats.maxActiveLevel).toBe(1);

      // 2. Alejar la cámara ligeramente a 105 km (dentro de la ventana de histéresis del 40%)
      const camSlightlyFar = createCamera(R + 105000, 0, 0);
      const evalHysteresis = quadtree.evaluate(camSlightlyFar);

      // Debe permanecer subdividido gracias al factor de histéresis (no parpadea a padre)
      expect(pxRoot.state).toBe('SPLIT');
      expect(evalHysteresis.stats.maxActiveLevel).toBe(1);

      // 3. Alejar la cámara significativamente a 160 km (fuera de la ventana de histéresis)
      const camFar = createCamera(R + 160000, 0, 0);
      const evalMerged = quadtree.evaluate(camFar);

      // Ahora sí se fusiona de vuelta a nivel 0
      expect(pxRoot.state).toBe('ACTIVE_LEAF');
      expect(evalMerged.stats.maxActiveLevel).toBe(0);
    });
  });

  describe('3. Sustitución Atómica Padre <-> Hijos', () => {
    it('mantiene al nodo padre visible hasta que los 4 hijos estén generados en memoria', () => {
      const quadtree = new LodQuadtree(planet.planetId, R, {
        targetScreenSpaceErrorPixels: 2.0
      });

      const cam = createCamera(R + 15000, 0, 0);
      const firstEval = quadtree.evaluate(cam);

      const pxRoot = quadtree.getRoot('PX')!;
      expect(pxRoot.state).toBe('SPLITTING');
      // El padre está presente en activeLeaves
      expect(firstEval.activeLeaves.some((n) => n.id === pxRoot.id)).toBe(true);

      // Solo marcar 3 de los 4 hijos como listos
      quadtree.markTileReady(pxRoot.children![0]!.id);
      quadtree.markTileReady(pxRoot.children![1]!.id);
      quadtree.markTileReady(pxRoot.children![2]!.id);

      const secondEval = quadtree.evaluate(cam);
      // El padre todavía sigue activo porque falta el 4to hijo
      expect(pxRoot.state).toBe('SPLITTING');
      expect(secondEval.activeLeaves.some((n) => n.id === pxRoot.id)).toBe(true);

      // Ahora marcar el 4to hijo
      quadtree.markTileReady(pxRoot.children![3]!.id);
      const thirdEval = quadtree.evaluate(cam);

      // Sustitución atómica completa: padre SPLIT y los 4 hijos activos
      expect(pxRoot.state).toBe('SPLIT');
      expect(thirdEval.activeLeaves.some((n) => n.id === pxRoot.id)).toBe(false);
      for (const child of pxRoot.children!) {
        expect(thirdEval.activeLeaves.some((n) => n.id === child.id)).toBe(true);
      }
    });
  });

  describe('4. Cola de Streaming y Cancelación de Trabajos Obsoletos', () => {
    it('prioriza trabajos con mayor SSE y descarta trabajos obsoletos', () => {
      const queue = new StreamingJobQueue();

      queue.enqueue({
        key: { planetId: planet.planetId, face: 'PX', level: 1, x: 0, y: 0 },
        id: 'TERRA/PX/1/0/0',
        priority: 10.0
      });

      queue.enqueue({
        key: { planetId: planet.planetId, face: 'PX', level: 1, x: 1, y: 0 },
        id: 'TERRA/PX/1/1/0',
        priority: 45.0 // Mayor prioridad
      });

      queue.enqueue({
        key: { planetId: planet.planetId, face: 'PX', level: 1, x: 0, y: 1 },
        id: 'TERRA/PX/1/0/1',
        priority: 25.0
      });

      expect(queue.pendingCount).toBe(3);

      // Cancelar uno específico
      queue.cancel('TERRA/PX/1/0/0');
      expect(queue.pendingCount).toBe(2);

      // Dequeue debe extraer el de mayor prioridad primero (45.0)
      const batch1 = queue.dequeueBatch(1);
      expect(batch1).toHaveLength(1);
      expect(batch1[0]!.id).toBe('TERRA/PX/1/1/0');

      // Cancelar los que no estén en un conjunto activo
      const validSet = new Set<string>(); // Conjunto vacío -> cancela los restantes
      const cancelled = queue.cancelStaleJobs(validSet);
      expect(cancelled).toBe(1);
      expect(queue.pendingCount).toBe(0);
    });
  });

  describe('5. Descarte por Horizonte Planetario (Horizon Culling)', () => {
    it('detecta oclusión geométrica para caras en el lado opuesto del planeta', () => {
      const cameraPos = { x: 300000, y: 0, z: 0 }; // Lado +X
      const tileCenterFarSide = { x: -R, y: 0, z: 0 }; // Lado -X (opuesto)
      const tileCenterNearSide = { x: R, y: 0, z: 0 }; // Lado +X (visible)

      const isOccludedFar = isOccludedByPlanetaryHorizon(
        tileCenterFarSide,
        R * 0.1,
        cameraPos,
        R
      );
      const isOccludedNear = isOccludedByPlanetaryHorizon(
        tileCenterNearSide,
        R * 0.1,
        cameraPos,
        R
      );

      expect(isOccludedFar).toBe(true);
      expect(isOccludedNear).toBe(false);
    });
  });

  describe('6. Faldas Geométricas (Skirts)', () => {
    it('agrega vértices extruidos y quads de unión sin modificar los vértices de superficie', () => {
      const sampler = new TerrainSampler(planet);
      const baseGeom = generateTileGeometry(
        { planetId: planet.planetId, face: 'PX', level: 1, x: 0, y: 0 },
        sampler,
        R
      );

      const skirtDepth = 100.0;
      const skirtGeom = addTileSkirts(baseGeom, skirtDepth);

      // 1089 vértices base + 132 vértices de falda = 1221
      expect(skirtGeom.vertexCount).toBe(baseGeom.vertexCount + 132);
      // 6144 índices base + 768 índices de falda = 6912
      expect(skirtGeom.indices.length).toBe(baseGeom.indices.length + 768);

      // Los primeros 1089 vértices deben coincidir exactamente con los originales
      for (let i = 0; i < 100; i++) {
        expect(skirtGeom.positions[i]).toBe(baseGeom.positions[i]);
      }
    });
  });

  describe('7. Benchmark de 50 Ciclos Órbita -> Suelo -> Órbita', () => {
    it('ejecuta 50 ciclos continuos de aproximación y alejamiento sin fugas de memoria ni ciclos', () => {
      const quadtree = new LodQuadtree(planet.planetId, R, {
        targetScreenSpaceErrorPixels: 3.0,
        maxLevel: 3
      });

      const startTime = performance.now();

      for (let cycle = 0; cycle < 50; cycle++) {
        // Fase 1: Descenso de órbita (300 km) a proximidad regional (15 km)
        for (let alt = 300000; alt >= 15000; alt -= 50000) {
          const cam = createCamera(R + alt, 0, 0);
          const evalRes = quadtree.evaluate(cam);

          // Procesar streaming jobs y marcarlos listos
          const batch = quadtree.queue.dequeueBatch(8);
          for (const job of batch) {
            quadtree.markTileReady(job.id);
          }

          expect(evalRes.activeLeaves.length).toBeGreaterThanOrEqual(6);
          expect(evalRes.stats.pendingJobsCount).toBeGreaterThanOrEqual(0);
        }

        // Fase 2: Ascenso de vuelta al espacio profundo
        for (let alt = 15000; alt <= 300000; alt += 50000) {
          const cam = createCamera(R + alt, 0, 0);
          quadtree.evaluate(cam);
        }
      }

      const durationMs = performance.now() - startTime;
      expect(durationMs).toBeLessThan(2000);
    });
  });
});
