import { describe, expect, it } from 'vitest';
import {
  createFactionId,
  createFacilityId,
  createLotId,
  createResourceId
} from '@universo/shared';
import type { InventoryLot } from '../inventory/index.js';
import { RoadNetworkGraph, type RoadEdge } from '../roads/index.js';
import {
  PrivateBuildingEngine,
  ZoningService,
  ZONE_BUILDING_COSTS,
  type CitySimulationContext
} from './index.js';

describe('T22 — Zonificación, parcelas y edificación privada automatizada', () => {
  const zoningService = new ZoningService();
  const buildingEngine = new PrivateBuildingEngine();

  // Carretera recta de prueba (100 metros)
  const mockRoad: RoadEdge = {
    edgeId: 'edge_main_st',
    startNodeId: 'node_1',
    endNodeId: 'node_2',
    roadType: 'PAVED_ROAD',
    widthMeters: 8.0,
    speedLimitKmH: 50,
    lengthMeters: 100.0,
    controlPoints: [],
    samples: [
      { x: 125000, y: 0, z: 0 },
      { x: 125000, y: 30, z: 0 },
      { x: 125000, y: 60, z: 0 },
      { x: 125000, y: 100, z: 0 }
    ],
    maxGradePercent: 1.0
  };

  const createMockLot = (resource: string, amount: number): InventoryLot => ({
    id: createLotId(`lot_${resource.toLowerCase()}`),
    locationId: createFacilityId('warehouse_central'),
    ownerId: createFactionId('city_authority'),
    resourceId: createResourceId(resource),
    onHand: amount,
    reserved: 0,
    version: 1
  });

  describe('1. Generación de Parcelas a lo Largo de Vías (ZoningService)', () => {
    it('genera parcelas pareadas (izquierda y derecha) con orientación hacia la calzada', () => {
      const parcels = zoningService.generateParcelsAlongRoad(mockRoad, {
        parcelWidthMeters: 16.0,
        parcelDepthMeters: 20.0
      });

      expect(parcels.length).toBeGreaterThanOrEqual(8);

      // Mitad izquierda, mitad derecha
      const leftParcels = parcels.filter((p) => p.parcelId.includes('_L_'));
      const rightParcels = parcels.filter((p) => p.parcelId.includes('_R_'));
      expect(leftParcels.length).toBe(rightParcels.length);

      // Todas inician en UNZONED y VACANT
      for (const p of parcels) {
        expect(p.status).toBe('VACANT');
        expect(p.zoneType).toBe('UNZONED');
        expect(p.roadEdgeId).toBe('edge_main_st');
        expect(p.widthMeters).toBe(16.0);
        expect(p.depthMeters).toBe(20.0);
      }
    });

    it('asigna zonas R/C/I sobre parcelas vacías', () => {
      const parcels = zoningService.generateParcelsAlongRoad(mockRoad);
      const resParcels = parcels.slice(0, 2);
      const comParcels = parcels.slice(2, 4);

      zoningService.applyZoning(resParcels, 'RESIDENTIAL');
      zoningService.applyZoning(comParcels, 'COMMERCIAL');

      expect(resParcels[0]?.zoneType).toBe('RESIDENTIAL');
      expect(resParcels[1]?.zoneType).toBe('RESIDENTIAL');
      expect(comParcels[0]?.zoneType).toBe('COMMERCIAL');
      expect(comParcels[1]?.zoneType).toBe('COMMERCIAL');
      expect(parcels[4]?.zoneType).toBe('UNZONED');
    });
  });

  describe('2. Algoritmo de Edificación Privada (PrivateBuildingEngine)', () => {
    it('construye edificios si hay carretera, mano de obra y materiales, deduciendo el inventario físico', () => {
      const parcels = zoningService.generateParcelsAlongRoad(mockRoad);
      zoningService.applyZoning(parcels.slice(0, 2), 'RESIDENTIAL');

      const graph = new RoadNetworkGraph();
      graph.edges.set(mockRoad.edgeId, mockRoad);

      const warehouseLots = new Map<string, InventoryLot>();
      warehouseLots.set('TIMBER', createMockLot('TIMBER', 200)); // 200 madera
      warehouseLots.set('STONE', createMockLot('STONE', 100)); // 100 piedra

      const context: CitySimulationContext = {
        parcels,
        roadGraph: graph,
        warehouseLots,
        availableLaborWorkers: 20,
        demand: {
          RESIDENTIAL: 0.8,
          COMMERCIAL: 0.5,
          INDUSTRIAL: 0.5,
          AGRICULTURAL: 0.0,
          UNZONED: 0.0
        },
        currentTick: 500
      };

      const res = buildingEngine.step(context);

      expect(res.newBuildingsCount).toBe(2);
      expect(res.results.filter((r) => r.success).length).toBe(2);

      // Verificar parcelas ocupadas
      expect(parcels[0]?.status).toBe('OCCUPIED');
      expect(parcels[0]?.building).toBeDefined();
      expect(parcels[0]?.building?.category).toBe('residential_low');

      // Verificar consumo de mano de obra (5 obreros por casa residencial x 2 = 10)
      const costPerHouse = ZONE_BUILDING_COSTS.RESIDENTIAL;
      expect(res.consumedLabor).toBe(costPerHouse.laborWorkers * 2);

      // Verificar consumo de materiales físicos sin teletransporte
      const timberLot = warehouseLots.get('TIMBER')!;
      const stoneLot = warehouseLots.get('STONE')!;
      expect(timberLot.onHand).toBe(200 - costPerHouse.materials.TIMBER! * 2);
      expect(stoneLot.onHand).toBe(100 - costPerHouse.materials.STONE! * 2);
    });

    it('rechaza la construcción si la parcela no tiene acceso a carretera conectada', () => {
      const parcels = zoningService.generateParcelsAlongRoad(mockRoad);
      zoningService.applyZoning(parcels.slice(0, 1), 'COMMERCIAL');

      // Grafo vacío (carretera inexistente o rota)
      const emptyGraph = new RoadNetworkGraph();
      const warehouseLots = new Map<string, InventoryLot>();
      warehouseLots.set('TIMBER', createMockLot('TIMBER', 1000));
      warehouseLots.set('STONE', createMockLot('STONE', 1000));

      const context: CitySimulationContext = {
        parcels,
        roadGraph: emptyGraph,
        warehouseLots,
        availableLaborWorkers: 50,
        demand: { RESIDENTIAL: 1, COMMERCIAL: 1, INDUSTRIAL: 1, AGRICULTURAL: 1, UNZONED: 0 },
        currentTick: 100
      };

      const res = buildingEngine.step(context);
      expect(res.newBuildingsCount).toBe(0);

      const failed = res.results.find((r) => r.parcelId === parcels[0]?.parcelId);
      expect(failed?.success).toBe(false);
      expect(failed?.failureReason).toBe('MISSING_ROAD_ACCESS');
      expect(parcels[0]?.status).toBe('VACANT');
    });

    it('rechaza la construcción si la mano de obra disponible es insuficiente', () => {
      const parcels = zoningService.generateParcelsAlongRoad(mockRoad);
      zoningService.applyZoning(parcels.slice(0, 1), 'INDUSTRIAL'); // Requiere 15 obreros

      const graph = new RoadNetworkGraph();
      graph.edges.set(mockRoad.edgeId, mockRoad);

      const warehouseLots = new Map<string, InventoryLot>();
      warehouseLots.set('TIMBER', createMockLot('TIMBER', 1000));
      warehouseLots.set('STONE', createMockLot('STONE', 1000));

      const context: CitySimulationContext = {
        parcels,
        roadGraph: graph,
        warehouseLots,
        availableLaborWorkers: 5, // Solo 5 obreros disponibles (< 15)
        demand: { RESIDENTIAL: 1, COMMERCIAL: 1, INDUSTRIAL: 1, AGRICULTURAL: 1, UNZONED: 0 },
        currentTick: 100
      };

      const res = buildingEngine.step(context);
      expect(res.newBuildingsCount).toBe(0);

      const failed = res.results.find((r) => r.parcelId === parcels[0]?.parcelId);
      expect(failed?.success).toBe(false);
      expect(failed?.failureReason).toBe('INSUFFICIENT_LABOR');
    });

    it('rechaza la construcción si los materiales en almacén son insuficientes, conservando existencias', () => {
      const parcels = zoningService.generateParcelsAlongRoad(mockRoad);
      zoningService.applyZoning(parcels.slice(0, 1), 'RESIDENTIAL'); // Requiere 30 madera y 15 piedra

      const graph = new RoadNetworkGraph();
      graph.edges.set(mockRoad.edgeId, mockRoad);

      const warehouseLots = new Map<string, InventoryLot>();
      warehouseLots.set('TIMBER', createMockLot('TIMBER', 10)); // Solo 10 madera (< 30)
      warehouseLots.set('STONE', createMockLot('STONE', 50));

      const context: CitySimulationContext = {
        parcels,
        roadGraph: graph,
        warehouseLots,
        availableLaborWorkers: 20,
        demand: { RESIDENTIAL: 1, COMMERCIAL: 1, INDUSTRIAL: 1, AGRICULTURAL: 1, UNZONED: 0 },
        currentTick: 100
      };

      const res = buildingEngine.step(context);
      expect(res.newBuildingsCount).toBe(0);

      const failed = res.results.find((r) => r.parcelId === parcels[0]?.parcelId);
      expect(failed?.success).toBe(false);
      expect(failed?.failureReason).toBe('INSUFFICIENT_MATERIALS');

      // Las existencias en mano deben preservarse intactas (no se gastó madera ni piedra)
      expect(warehouseLots.get('TIMBER')!.onHand).toBe(10);
      expect(warehouseLots.get('STONE')!.onHand).toBe(50);
    });
  });
});
