import { describe, expect, it } from 'vitest';
import {
  projectSplineOnTerrain,
  RoadNetworkGraph,
  ROAD_GROUND_OFFSET_METERS,
  type TerrainElevationQuery
} from './index.js';

describe('T21 — Editor de carreteras curvas y conectividad vial (Grafo y Splines)', () => {
  const planetRadiusMeters = 125000.0;

  // Mock de elevación de terreno con colina suave
  const mockSampler: TerrainElevationQuery = {
    sample(ux: number, _uy: number, _uz: number) {
      // Elevación base de 100m con colina suave en ux > 0
      const hill = ux > 0 ? ux * 150 : 0;
      return { heightMeters: 100.0 + hill };
    }
  };

  describe('1. Proyección de Curvas Spline sobre Relieve Esférico (projectSplineOnTerrain)', () => {
    it('genera muestras continuas siguiendo la curvatura del planeta con elevación exacta', () => {
      const pStart = { x: planetRadiusMeters + 100, y: 0, z: 0 };
      const pMid = { x: (planetRadiusMeters + 100) * 0.999, y: (planetRadiusMeters + 100) * 0.04, z: 0 };
      const pEnd = { x: (planetRadiusMeters + 100) * 0.996, y: (planetRadiusMeters + 100) * 0.08, z: 0 };

      const result = projectSplineOnTerrain([pStart, pMid, pEnd], mockSampler, planetRadiusMeters, 32);

      expect(result.samples.length).toBeGreaterThanOrEqual(30);
      expect(result.lengthMeters).toBeGreaterThan(1000.0);

      // Cada muestra debe estar situada a la altura del terreno + offset de seguridad
      for (const sample of result.samples) {
        const r = Math.hypot(sample.x, sample.y, sample.z);
        const ux = sample.x / r;
        const uy = sample.y / r;
        const uz = sample.z / r;
        const h = mockSampler.sample(ux, uy, uz).heightMeters;

        expect(r).toBeCloseTo(planetRadiusMeters + h + ROAD_GROUND_OFFSET_METERS, 2);
      }
    });

    it('calcula la longitud física acumulada y la pendiente porcentual máxima', () => {
      const p0 = { x: planetRadiusMeters + 100, y: 0, z: 0 };
      const p1 = { x: planetRadiusMeters + 100, y: 500, z: 0 };

      const result = projectSplineOnTerrain([p0, p1], mockSampler, planetRadiusMeters, 16);

      expect(result.lengthMeters).toBeGreaterThan(498.0);
      expect(result.lengthMeters).toBeLessThan(505.0);
      expect(result.maxGradePercent).toBeGreaterThanOrEqual(0.0);
      expect(result.maxGradePercent).toBeLessThan(100.0);
    });
  });

  describe('2. Grafo Determinista de Carreteras y Snapping (RoadNetworkGraph)', () => {
    it('ejecuta auto-snapping de nodos cuando los trazados convergen a menos de 5 metros', () => {
      const graph = new RoadNetworkGraph();
      const pOrigin = { x: planetRadiusMeters + 100, y: 0, z: 0 };
      const pEast = { x: planetRadiusMeters + 100, y: 300, z: 0 };
      const pNorth = { x: planetRadiusMeters + 100, y: 0, z: 300 };

      // Carretera 1: Origen -> Este
      const edge1 = graph.addRoad(pOrigin, pEast, 'PAVED_ROAD', mockSampler, planetRadiusMeters);

      // Carretera 2: Clic a 2 metros del Origen -> Norte
      const pOriginNear = { x: planetRadiusMeters + 100, y: 2.0, z: 0 };
      const edge2 = graph.addRoad(pOriginNear, pNorth, 'PAVED_ROAD', mockSampler, planetRadiusMeters);

      // Debe reutilizar el mismo nodo de origen (snapping exitoso)
      expect(edge1.startNodeId).toBe(edge2.startNodeId);
      expect(graph.nodes.size).toBe(3); // Solo 3 nodos: Origen, Este y Norte
      expect(graph.edges.size).toBe(2);

      const intersectionNode = graph.nodes.get(edge1.startNodeId)!;
      expect(intersectionNode.connectedEdgeIds).toContain(edge1.edgeId);
      expect(intersectionNode.connectedEdgeIds).toContain(edge2.edgeId);
    });

    it('valida la pendiente admisible según el tipo de calzada (autopista vs camino de tierra)', () => {
      const graph = new RoadNetworkGraph();

      // Sampler con acantilado empinado (pendiente física del 40% en espacio métrico)
      const steepSampler: TerrainElevationQuery = {
        sample(_ux: number, uy: number, _uz: number) {
          const yMeters = Math.abs(uy * planetRadiusMeters);
          return { heightMeters: 100.0 + yMeters * 0.4 };
        }
      };

      const pStart = { x: planetRadiusMeters + 100, y: 0, z: 0 };
      const pEnd = { x: planetRadiusMeters + 100, y: 100, z: 0 };

      // Autopista con rasante estricta (límite 7% * 1.5 = 10.5%) debe ser rechazada
      expect(() => {
        graph.addRoad(pStart, pEnd, 'HIGHWAY', steepSampler, planetRadiusMeters);
      }).toThrow(/Pendiente excesiva/);

      // Camino de tierra admite pendientes mayores
      const dirtEdge = graph.addRoad(pStart, pEnd, 'DIRT_TRACK', steepSampler, planetRadiusMeters);
      expect(dirtEdge).toBeDefined();
      expect(dirtEdge.roadType).toBe('DIRT_TRACK');
    });

    it('encuentra la ruta óptima de conectividad vial mediante A* (findPath)', () => {
      const graph = new RoadNetworkGraph();

      // Red vial:
      // A (0,0) <--- Lenta (Gravel) ---> B (1000, 0)
      // A (0,0) <--- Rápida (Highway) --> C (500, 500) <--- Rápida (Highway) --> B (1000, 0)
      const pA = { x: planetRadiusMeters + 100, y: 0, z: 0 };
      const pB = { x: planetRadiusMeters + 100, y: 2000, z: 0 };
      const pC = { x: planetRadiusMeters + 100, y: 1000, z: 1000 };

      // Ruta directa lenta (Gravel, 50 km/h)
      graph.addRoad(pA, pB, 'GRAVEL_ROAD', mockSampler, planetRadiusMeters);

      // Ruta indirecta rápida (Highway, 120 km/h)
      graph.addRoad(pA, pC, 'HIGHWAY', mockSampler, planetRadiusMeters);
      graph.addRoad(pC, pB, 'HIGHWAY', mockSampler, planetRadiusMeters);

      const nodeA = graph.getOrCreateNode(pA, 100);
      const nodeB = graph.getOrCreateNode(pB, 100);

      const pathResult = graph.findPath(nodeA.nodeId, nodeB.nodeId);
      expect(pathResult).toBeDefined();
      expect(pathResult?.pathNodeIds.length).toBe(3); // A -> C -> B es más rápido por velocidad de autopista
      expect(pathResult?.estimatedTravelTimeSeconds).toBeGreaterThan(0);
    });

    it('serializa y deserializa el grafo completamente sin pérdida (Roundtrip)', () => {
      const graph = new RoadNetworkGraph();
      const p1 = { x: planetRadiusMeters + 100, y: 0, z: 0 };
      const p2 = { x: planetRadiusMeters + 100, y: 400, z: 0 };

      graph.addRoad(p1, p2, 'PAVED_ROAD', mockSampler, planetRadiusMeters);

      const serialized = graph.serialize();
      expect(serialized.nodes.length).toBe(2);
      expect(serialized.edges.length).toBe(1);

      const restored = RoadNetworkGraph.deserialize(serialized);
      expect(restored.nodes.size).toBe(2);
      expect(restored.edges.size).toBe(1);

      const restoredEdge = Array.from(restored.edges.values())[0]!;
      expect(restoredEdge.roadType).toBe('PAVED_ROAD');
      expect(restoredEdge.samples.length).toBeGreaterThan(10);
    });
  });
});
