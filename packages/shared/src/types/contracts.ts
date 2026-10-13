import type {
  PlanetId,
  RegionId,
  CityId,
  FacilityId,
  LotId,
  ShipmentId,
  FactionId,
  UserId,
  ResourceId
} from './identifiers.js';

export const PROTOCOL_VERSION = '1.0.0';

export interface UserSessionDTO {
  userId: UserId;
  factionId: FactionId;
  role: string;
}

export interface CitySummaryDTO {
  cityId: CityId;
  regionId: RegionId;
  planetId: PlanetId;
  name: string;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface TerrainParameters {
  octaves: number;
  persistence: number;
  lacunarity: number;
  heightScale: number;
}

export interface PlanetDefinition {
  planetId: PlanetId;
  seed: string;
  generatorVersion: string;
  radiusMeters: number; // 125,000 m (diámetro 250 km)
  seaLevelMeters: number;
  terrain: TerrainParameters;
}

export interface InventoryLotDTO {
  id: LotId;
  locationId: FacilityId;
  ownerId: FactionId;
  resourceId: ResourceId;
  quantity: number; // Seguro dentro de Number.MAX_SAFE_INTEGER
  reserved: number;
  version: number;
}

export type ShipmentStatus =
  | 'REQUESTED'
  | 'RESERVED'
  | 'LOADING'
  | 'IN_TRANSIT'
  | 'REROUTING'
  | 'DELIVERED'
  | 'LOST'
  | 'CANCELLED';

export interface ShipmentDTO {
  id: ShipmentId;
  originId: FacilityId;
  destinationId: FacilityId;
  cargoLotIds: LotId[];
  status: ShipmentStatus;
  routeVersion: number;
  departureUtc: string;
  arrivalEtaUtc: string;
  idempotencyKey: string;
}

// Mensajería WebSocket Cliente -> Servidor
export type ClientMessage =
  | { type: 'PING'; timestamp: number }
  | { type: 'REQUEST_SYNC'; planetId: PlanetId; sinceSequence?: number }
  | {
      type: 'DISPATCH_SHIPMENT';
      idempotencyKey: string;
      originId: FacilityId;
      destinationId: FacilityId;
      resourceId: ResourceId;
      amount: number;
    };

// Mensajería WebSocket Servidor -> Cliente
export type ServerMessage =
  | { type: 'PONG'; timestamp: number; serverTimeUtc: string }
  | {
      type: 'SYNC_SNAPSHOT';
      epoch: number;
      sequence: number;
      planet: PlanetDefinition;
      inventories: InventoryLotDTO[];
      shipments: ShipmentDTO[];
    }
  | {
      type: 'EVENT_NOTIFICATION';
      sequence: number;
      eventType: string;
      payload: unknown;
    }
  | {
      type: 'ERROR';
      code: string;
      message: string;
      requestId?: string;
    };
