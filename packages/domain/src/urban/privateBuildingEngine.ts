import {
  InventoryDomainService,
  type InventoryLot
} from '../inventory/index.js';
import type { RoadNetworkGraph } from '../roads/roadGraph.js';
import {
  ZONE_BUILDING_COSTS,
  type BuildingInstance,
  type ConstructionAttemptResult,
  type Parcel,
  type ZoneType
} from './types.js';

export interface CitySimulationContext {
  parcels: Parcel[];
  roadGraph: RoadNetworkGraph;
  warehouseLots: Map<string, InventoryLot>; // Key: resourceId ('TIMBER', 'STONE', etc.)
  availableLaborWorkers: number;
  demand: Record<ZoneType, number>; // Demanda relativa (0 a 1)
  currentTick: number;
}

export interface SimulationStepResult {
  results: ConstructionAttemptResult[];
  consumedLabor: number;
  consumedMaterials: Record<string, number>;
  newBuildingsCount: number;
}

export class PrivateBuildingEngine {
  private nextBuildingSeq = 1;

  /**
   * Ejecuta un ciclo de simulación de inversión y edificación privada.
   * Construye edificios exclusivamente si la parcela tiene acceso vial, mano de obra y materiales físicos.
   */
  public step(context: CitySimulationContext): SimulationStepResult {
    const results: ConstructionAttemptResult[] = [];
    let remainingLabor = context.availableLaborWorkers;
    const consumedMaterials: Record<string, number> = {};
    let newBuildingsCount = 0;

    for (const parcel of context.parcels) {
      if (parcel.zoneType === 'UNZONED') continue;
      if (parcel.status !== 'VACANT') continue;

      // 1. Verificar demanda para la zona
      const zoneDemand = context.demand[parcel.zoneType] ?? 0;
      if (zoneDemand <= 0) {
        results.push({
          parcelId: parcel.parcelId,
          success: false,
          failureReason: 'NO_DEMAND'
        });
        continue;
      }

      // 2. Verificar condición 1: Conexión vial directa
      if (!context.roadGraph.edges.has(parcel.roadEdgeId)) {
        results.push({
          parcelId: parcel.parcelId,
          success: false,
          failureReason: 'MISSING_ROAD_ACCESS'
        });
        continue;
      }

      const cost = ZONE_BUILDING_COSTS[parcel.zoneType];

      // 3. Verificar condición 2: Mano de obra suficiente
      if (remainingLabor < cost.laborWorkers) {
        results.push({
          parcelId: parcel.parcelId,
          success: false,
          failureReason: 'INSUFFICIENT_LABOR'
        });
        continue;
      }

      // 4. Verificar condición 3: Materiales físicos disponibles en almacén (sin teletransporte)
      let canAffordMaterials = true;
      for (const [resId, reqAmount] of Object.entries(cost.materials)) {
        const lot = context.warehouseLots.get(resId);
        if (!lot) {
          canAffordMaterials = false;
          break;
        }
        const avail = InventoryDomainService.getAvailable(lot);
        if (avail < reqAmount) {
          canAffordMaterials = false;
          break;
        }
      }

      if (!canAffordMaterials) {
        results.push({
          parcelId: parcel.parcelId,
          success: false,
          failureReason: 'INSUFFICIENT_MATERIALS'
        });
        continue;
      }

      // 5. Deducción atómica y consumo de materiales mediante InventoryDomainService
      for (const [resId, reqAmount] of Object.entries(cost.materials)) {
        let lot = context.warehouseLots.get(resId)!;
        // Reservar y consumir material físico
        lot = InventoryDomainService.reserve(lot, reqAmount);
        lot = InventoryDomainService.consumeReserved(lot, reqAmount);
        context.warehouseLots.set(resId, lot);

        consumedMaterials[resId] = (consumedMaterials[resId] ?? 0) + reqAmount;
      }

      remainingLabor -= cost.laborWorkers;

      // 6. Generar edificio según la zona
      const building = this.createBuildingInstance(parcel, context.currentTick);
      parcel.building = building;
      parcel.status = 'OCCUPIED';
      newBuildingsCount++;

      results.push({
        parcelId: parcel.parcelId,
        success: true,
        building
      });
    }

    return {
      results,
      consumedLabor: context.availableLaborWorkers - remainingLabor,
      consumedMaterials,
      newBuildingsCount
    };
  }

  private createBuildingInstance(parcel: Parcel, currentTick: number): BuildingInstance {
    const buildingId = `bld_${parcel.zoneType.toLowerCase()}_${this.nextBuildingSeq++}`;

    let category = 'house';
    let popCap = 4;
    let workCap = 0;

    switch (parcel.zoneType) {
      case 'RESIDENTIAL':
        category = 'residential_low';
        popCap = 6;
        workCap = 0;
        break;
      case 'COMMERCIAL':
        category = 'shop_market';
        popCap = 0;
        workCap = 5;
        break;
      case 'INDUSTRIAL':
        category = 'workshop_forge';
        popCap = 0;
        workCap = 12;
        break;
      case 'AGRICULTURAL':
        category = 'farmstead';
        popCap = 2;
        workCap = 4;
        break;
      default:
        break;
    }

    return {
      buildingId,
      parcelId: parcel.parcelId,
      zoneType: parcel.zoneType,
      category,
      level: 1,
      populationCapacity: popCap,
      workerCapacity: workCap,
      workersEmployed: 0,
      residentsCurrent: 0,
      createdAtTick: currentTick
    };
  }
}
