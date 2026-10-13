import type { Vector3D } from '@universo/shared';

export type ZoneType = 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'AGRICULTURAL' | 'UNZONED';

export type ParcelStatus = 'VACANT' | 'PLANNING' | 'CONSTRUCTING' | 'OCCUPIED' | 'ABANDONED';

export interface ConstructionCost {
  materials: Record<string, number>; // Ej: { TIMBER: 40, STONE: 25 }
  laborWorkers: number; // Trabajadores requeridos
}

export const ZONE_BUILDING_COSTS: Record<ZoneType, ConstructionCost> = {
  RESIDENTIAL: {
    materials: { TIMBER: 30, STONE: 15 },
    laborWorkers: 5
  },
  COMMERCIAL: {
    materials: { TIMBER: 45, STONE: 35 },
    laborWorkers: 8
  },
  INDUSTRIAL: {
    materials: { TIMBER: 60, STONE: 80 },
    laborWorkers: 15
  },
  AGRICULTURAL: {
    materials: { TIMBER: 20, STONE: 5 },
    laborWorkers: 4
  },
  UNZONED: {
    materials: {},
    laborWorkers: 0
  }
};

export interface BuildingInstance {
  buildingId: string;
  parcelId: string;
  zoneType: ZoneType;
  category: string;
  level: number;
  populationCapacity: number;
  workerCapacity: number;
  workersEmployed: number;
  residentsCurrent: number;
  createdAtTick: number;
}

export interface Parcel {
  parcelId: string;
  tileId: string;
  roadEdgeId: string;
  zoneType: ZoneType;
  status: ParcelStatus;
  center: Vector3D;
  forward: Vector3D; // Orientación perpendicular hacia la calzada
  widthMeters: number;
  depthMeters: number;
  building?: BuildingInstance;
  densityLevel: number;
}

export interface ConstructionAttemptResult {
  parcelId: string;
  success: boolean;
  building?: BuildingInstance;
  failureReason?: 'MISSING_ROAD_ACCESS' | 'INSUFFICIENT_LABOR' | 'INSUFFICIENT_MATERIALS' | 'NO_DEMAND' | 'NOT_VACANT';
}
