import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';
import {
  TilePersistenceDatabase,
  applyPersistedDeltasToTileGeometry,
  type RoadSegment,
  type TileResourceDeposit,
  type TileTerrainModification
} from './index.js';

describe('T20 — Persistencia SQLite de ediciones de relieve, carreteras y agotamiento', () => {
  const tempFiles: string[] = [];

  afterEach(() => {
    for (const f of tempFiles) {
      if (fs.existsSync(f)) {
        fs.unlinkSync(f);
      }
    }
    tempFiles.length = 0;
  });

  describe('1. Ediciones de Relieve y Versionado Atómico (applyTerrainDeltas)', () => {
    it('aplica deltas de elevación en transacciones ACID e incrementa la versión de la tesela', async () => {
      const db = await TilePersistenceDatabase.create();
      const tileId = 'TERRA_PRIME/PX/2/1/1';

      const deltas1: TileTerrainModification[] = [
        { tileId, vertexIndex: 120, heightDeltaMeters: -10.5 }, // Excavación de 10.5 m
        { tileId, vertexIndex: 121, heightDeltaMeters: -8.0, biomeOverride: 'QUARRY_ROCK' }
      ];

      const v1 = db.applyTerrainDeltas(tileId, deltas1, 100);
      expect(v1).toBe(1);

      const state1 = db.getTileState(tileId);
      expect(state1.version).toBe(1);
      expect(state1.lastModifiedTick).toBe(100);
      expect(state1.modifications.length).toBe(2);

      const m120 = state1.modifications.find((m) => m.vertexIndex === 120);
      expect(m120?.heightDeltaMeters).toBe(-10.5);

      // Segunda edición acumulativa en el mismo vértice (terraplén de corrección de +3 m)
      const deltas2: TileTerrainModification[] = [
        { tileId, vertexIndex: 120, heightDeltaMeters: 3.0 }
      ];

      const v2 = db.applyTerrainDeltas(tileId, deltas2, 105);
      expect(v2).toBe(2);

      const state2 = db.getTileState(tileId);
      expect(state2.version).toBe(2);
      expect(state2.lastModifiedTick).toBe(105);

      const m120Updated = state2.modifications.find((m) => m.vertexIndex === 120);
      // -10.5 + 3.0 = -7.5 m
      expect(m120Updated?.heightDeltaMeters).toBeCloseTo(-7.5, 2);

      db.close();
    });
  });

  describe('2. Segmentos de Carreteras (saveRoadSegment)', () => {
    it('persiste segmentos viales y actualiza la versión del tile para invalidación de caché', async () => {
      const db = await TilePersistenceDatabase.create();
      const tileId = 'TERRA_PRIME/PX/2/1/1';

      const road: RoadSegment = {
        roadId: 'road-seg-001',
        tileId,
        roadType: 'PAVED_ROAD',
        uStart: -0.2,
        vStart: 0.1,
        uEnd: 0.4,
        vEnd: 0.3,
        widthMeters: 8.0,
        condition: 1.0,
        createdAtTick: 120
      };

      const v = db.saveRoadSegment(road, 120);
      expect(v).toBe(1);

      const state = db.getTileState(tileId);
      expect(state.roads.length).toBe(1);
      expect(state.roads[0]?.roadId).toBe('road-seg-001');
      expect(state.roads[0]?.roadType).toBe('PAVED_ROAD');
      expect(state.roads[0]?.widthMeters).toBe(8.0);

      db.close();
    });
  });

  describe('3. Agotamiento de Recursos y Conservación Material (extractResource)', () => {
    it('extrae reservas naturales y previene sobre-extracción o duplicación de recursos', async () => {
      const db = await TilePersistenceDatabase.create();
      const tileId = 'TERRA_PRIME/PX/2/1/1';

      const deposit: TileResourceDeposit = {
        depositId: 'mine-iron-77',
        tileId,
        resourceId: 'IRON_ORE',
        initialReserve: 1000.0,
        currentReserve: 1000.0,
        depletedAmount: 0.0,
        isDepleted: false,
        lastExtractedTick: 0
      };

      db.registerDeposit(deposit);

      // Extracción parcial: 400 unidades
      const res1 = db.extractResource('mine-iron-77', 400.0, 50);
      expect(res1.currentReserve).toBe(600.0);
      expect(res1.depletedAmount).toBe(400.0);
      expect(res1.isDepleted).toBe(false);

      // Extracción total de las 600 unidades restantes
      const res2 = db.extractResource('mine-iron-77', 600.0, 60);
      expect(res2.currentReserve).toBe(0.0);
      expect(res2.depletedAmount).toBe(1000.0);
      expect(res2.isDepleted).toBe(true);

      // Intentar extraer de yacimiento agotado debe fallar
      expect(() => {
        db.extractResource('mine-iron-77', 50.0, 70);
      }).toThrow(/agotado/);

      // Intentar extraer más de lo disponible en otro yacimiento
      const woodDeposit: TileResourceDeposit = {
        depositId: 'forest-timber-12',
        tileId,
        resourceId: 'TIMBER',
        initialReserve: 200.0,
        currentReserve: 200.0,
        depletedAmount: 0.0,
        isDepleted: false,
        lastExtractedTick: 0
      };
      db.registerDeposit(woodDeposit);

      expect(() => {
        db.extractResource('forest-timber-12', 350.0, 75);
      }).toThrow(/Extracción excedida/);

      db.close();
    });
  });

  describe('4. Sobrevivencia a Recarga de Navegador y Reinicio (Disk Persistence)', () => {
    it('persiste y recupera íntegramente las excavaciones, carreteras y reservas tras recarga', async () => {
      const tempDbPath = path.join(os.tmpdir(), `worlio_test_${Date.now()}.sqlite`);
      tempFiles.push(tempDbPath);

      // Sesión 1: Realizar modificaciones en el planeta
      const db1 = await TilePersistenceDatabase.create();
      const tileId = 'TERRA_PRIME/PZ/3/0/0';

      db1.applyTerrainDeltas(
        tileId,
        [{ tileId, vertexIndex: 50, heightDeltaMeters: -15.0 }],
        200
      );

      db1.saveRoadSegment(
        {
          roadId: 'highway-01',
          tileId,
          roadType: 'HIGHWAY',
          uStart: -0.5,
          vStart: 0.0,
          uEnd: 0.5,
          vEnd: 0.0,
          widthMeters: 12.0,
          condition: 0.95,
          createdAtTick: 210
        },
        210
      );

      db1.registerDeposit({
        depositId: 'stone-quarry-1',
        tileId,
        resourceId: 'STONE',
        initialReserve: 5000,
        currentReserve: 3500,
        depletedAmount: 1500,
        isDepleted: false,
        lastExtractedTick: 215
      });

      // Guardar a disco
      db1.saveToFile(tempDbPath);
      db1.close();

      // Sesión 2: Reiniciar servidor / recargar navegador y leer de disco
      const db2 = await TilePersistenceDatabase.loadFromFile(tempDbPath);
      const restoredState = db2.getTileState(tileId);

      expect(restoredState.version).toBe(2);
      expect(restoredState.modifications.length).toBe(1);
      expect(restoredState.modifications[0]?.heightDeltaMeters).toBe(-15.0);

      expect(restoredState.roads.length).toBe(1);
      expect(restoredState.roads[0]?.roadId).toBe('highway-01');
      expect(restoredState.roads[0]?.condition).toBe(0.95);

      expect(restoredState.deposits.length).toBe(1);
      expect(restoredState.deposits[0]?.depositId).toBe('stone-quarry-1');
      expect(restoredState.deposits[0]?.currentReserve).toBe(3500);
      expect(restoredState.deposits[0]?.depletedAmount).toBe(1500);

      db2.close();
    });
  });

  describe('5. Aplicación Determinista sobre Malla de Terreno (applyPersistedDeltasToTileGeometry)', () => {
    it('desplaza radialmente los vértices excavados y recalcula las normales topográficas', () => {
      // Mock de geometría de tesela
      const numVertices = 9; // 3x3 vértices
      const worldPositions = new Float64Array(numVertices * 3);
      const positions = new Float32Array(numVertices * 3);
      const normals = new Float32Array(numVertices * 3);
      const colors = new Float32Array(numVertices * 4);
      const heights = new Float32Array(numVertices);
      const indices = new Uint32Array(8 * 3);

      const R = 125000;
      for (let i = 0; i < numVertices; i++) {
        worldPositions[i * 3] = R; // A lo largo de +X
        worldPositions[i * 3 + 1] = (i % 3) * 10;
        worldPositions[i * 3 + 2] = Math.floor(i / 3) * 10;
        normals[i * 3] = 1.0;
        heights[i] = 100.0;
        colors[i * 4] = 0.2;
        colors[i * 4 + 1] = 0.5;
        colors[i * 4 + 2] = 0.2;
        colors[i * 4 + 3] = 1.0;
      }

      const mockGeom = {
        id: 'tile-001',
        bounds: { uMin: -0.1, uMax: 0.1, vMin: -0.1, vMax: 0.1 },
        localAnchor: { x: R, y: 0, z: 0 },
        worldPositions,
        positions,
        normals,
        colors,
        heights,
        indices
      };

      const tileState = {
        tileId: 'tile-001',
        version: 1,
        lastModifiedTick: 50,
        modifications: [
          {
            tileId: 'tile-001',
            vertexIndex: 4, // Vértice central
            heightDeltaMeters: -20.0, // Fosa de 20 m
            biomeOverride: 'QUARRY_ROCK'
          }
        ],
        roads: [],
        deposits: []
      };

      const modifiedGeom = applyPersistedDeltasToTileGeometry(mockGeom, tileState, 2);

      // La altura del vértice central debe ser 100 - 20 = 80 m
      expect(modifiedGeom.heights[4]).toBe(80.0);

      // La posición X del vértice central debe haberse retraído en 20 m
      expect(modifiedGeom.worldPositions[4 * 3]).toBeCloseTo(R - 20.0, 1);

      // Color cambiado por el biome override a roca de cantera
      expect(modifiedGeom.colors[4 * 4]).toBeCloseTo(0.45, 2);

      // La normal topográfica del vértice 4 debe haberse recalculado y mantenerse unitaria
      const nx = modifiedGeom.normals[4 * 3]!;
      const ny = modifiedGeom.normals[4 * 3 + 1]!;
      const nz = modifiedGeom.normals[4 * 3 + 2]!;
      const nLen = Math.hypot(nx, ny, nz);
      expect(nLen).toBeCloseTo(1.0, 3);
    });
  });
});
