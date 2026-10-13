import { NullEngine, Scene } from '@babylonjs/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RoadNetworkGraph, type RoadEdge, type TerrainElevationQuery } from '@universo/domain';
import { createRoadRibbonMesh } from './roadMeshBuilder.js';
import { RoadEditorController } from './roadEditorController.js';

describe('T21 — Cliente: Malla de Cinta de Carretera y Controlador de Edición', () => {
  let engine: NullEngine;
  let scene: Scene;

  const mockSampler: TerrainElevationQuery = {
    sample(_ux: number, _uy: number, _uz: number) {
      return { heightMeters: 50.0 };
    }
  };
  const planetRadius = 125000.0;

  beforeEach(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  describe('1. Constructor de Malla Ribbon (createRoadRibbonMesh)', () => {
    it('genera una malla 3D de cinta con posiciones, normales, UVs y colores válidos', () => {
      const mockEdge: RoadEdge = {
        edgeId: 'edge_test_1',
        startNodeId: 'node_1',
        endNodeId: 'node_2',
        roadType: 'PAVED_ROAD',
        widthMeters: 8.0,
        speedLimitKmH: 80,
        lengthMeters: 100.0,
        controlPoints: [],
        samples: [
          { x: planetRadius + 50, y: 0, z: 0 },
          { x: planetRadius + 50, y: 50, z: 0 },
          { x: planetRadius + 50, y: 100, z: 0 }
        ],
        maxGradePercent: 2.0
      };

      const anchor = { x: planetRadius + 50, y: 0, z: 0 };
      const mesh = createRoadRibbonMesh(mockEdge, scene, anchor);

      expect(mesh).toBeDefined();
      expect(mesh.name).toBe('road_edge_test_1');

      // 3 muestras -> 6 vértices (2 por muestra: izquierda y derecha)
      const positions = mesh.getVerticesData('position');
      expect(positions?.length).toBe(6 * 3);

      // (3 - 1) quads * 6 = 12 índices
      const indices = mesh.getIndices();
      expect(indices?.length).toBe(12);

      // Normales y UVs asignados
      const normals = mesh.getVerticesData('normal');
      expect(normals?.length).toBe(6 * 3);
      const uvs = mesh.getVerticesData('uv');
      expect(uvs?.length).toBe(6 * 2);
    });
  });

  describe('2. Controlador del Editor de Carreteras (RoadEditorController)', () => {
    it('administra el flujo interactivo de trazado: inicio, preview, waypoints y finalización', () => {
      const graph = new RoadNetworkGraph();
      const editor = new RoadEditorController(scene, graph, mockSampler, planetRadius);

      expect(editor.isPlacing).toBe(false);

      const pStart = { x: planetRadius + 50, y: 0, z: 0 };
      editor.startRoad(pStart);
      expect(editor.isPlacing).toBe(true);
      expect(editor.currentWaypoints.length).toBe(1);

      // Preview con cursor en movimiento
      const cursor = { x: planetRadius + 50, y: 50, z: 0 };
      const preview = editor.previewSpline(cursor);
      expect(preview).toBeDefined();
      expect(preview?.samples.length).toBeGreaterThan(10);
      expect(preview?.isGradeValid).toBe(true);

      // Añadir waypoint
      const pMid = { x: planetRadius + 50, y: 50, z: 0 };
      editor.addWaypoint(pMid);
      expect(editor.currentWaypoints.length).toBe(2);

      // Finalizar carretera
      const pEnd = { x: planetRadius + 50, y: 100, z: 0 };
      const edge = editor.finishRoad(pEnd);

      expect(edge).toBeDefined();
      expect(graph.edges.size).toBe(1);
      expect(graph.nodes.size).toBe(2);
      expect(editor.isPlacing).toBe(false);
      expect(editor.currentWaypoints.length).toBe(0);
    });

    it('detecta objetivos para auto-snapping con findSnapTarget', () => {
      const graph = new RoadNetworkGraph();
      const editor = new RoadEditorController(scene, graph, mockSampler, planetRadius, {
        snapDistanceMeters: 5.0
      });

      const pNode = { x: planetRadius + 50, y: 0, z: 0 };
      graph.getOrCreateNode(pNode, 50.0);

      // Clic a 2 metros -> debe detectar snap
      const targetNear = editor.findSnapTarget({ x: planetRadius + 50, y: 2.0, z: 0 });
      expect(targetNear).toBeDefined();
      expect(targetNear?.nodeId).toBe('node_1');

      // Clic a 15 metros -> no detecta snap
      const targetFar = editor.findSnapTarget({ x: planetRadius + 50, y: 15.0, z: 0 });
      expect(targetFar).toBeNull();
    });
  });
});
