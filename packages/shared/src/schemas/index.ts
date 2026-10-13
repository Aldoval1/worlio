import { z } from 'zod';
import {
  createPlanetId,
  createRegionId,
  createCityId,
  createFacilityId,
  createRoadId,
  createLotId,
  createShipmentId,
  createFactionId,
  createUserId,
  createResourceId,
  createArmyId,
  createTreatyId
} from '../types/identifiers.js';

// Esquemas de IDs tipados
export const PlanetIdSchema = z.string().min(3).max(64).transform(createPlanetId);
export const RegionIdSchema = z.string().min(3).max(64).transform(createRegionId);
export const CityIdSchema = z.string().min(3).max(64).transform(createCityId);
export const FacilityIdSchema = z.string().min(3).max(64).transform(createFacilityId);
export const RoadIdSchema = z.string().min(3).max(64).transform(createRoadId);
export const LotIdSchema = z.string().min(3).max(64).transform(createLotId);
export const ShipmentIdSchema = z.string().min(3).max(64).transform(createShipmentId);
export const FactionIdSchema = z.string().min(3).max(64).transform(createFactionId);
export const UserIdSchema = z.string().min(3).max(64).transform(createUserId);
export const ResourceIdSchema = z.string().min(2).max(32).transform(createResourceId);
export const ArmyIdSchema = z.string().min(3).max(64).transform(createArmyId);
export const TreatyIdSchema = z.string().min(3).max(64).transform(createTreatyId);

// Coordenadas
export const Vector3DSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite()
});

export const TerrainParametersSchema = z.object({
  octaves: z.number().int().min(1).max(12),
  persistence: z.number().min(0.0).max(1.0),
  lacunarity: z.number().min(1.0).max(4.0),
  heightScale: z.number().positive().max(20000)
});

export const PlanetDefinitionSchema = z.object({
  planetId: PlanetIdSchema,
  seed: z.string().min(1).max(128),
  generatorVersion: z.string().regex(/^v\d+\.\d+\.\d+$/),
  radiusMeters: z.number().positive().min(50000).max(1000000), // ~125.000 m
  seaLevelMeters: z.number().finite(),
  terrain: TerrainParametersSchema
});

// Inventarios y Lotes
export const InventoryLotDTOSchema = z
  .object({
    id: LotIdSchema,
    locationId: FacilityIdSchema,
    ownerId: FactionIdSchema,
    resourceId: ResourceIdSchema,
    quantity: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    reserved: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    version: z.number().int().positive()
  })
  .refine((data) => data.quantity >= data.reserved, {
    message: 'Invariante corrupto: la cantidad reservada supera las existencias disponibles'
  });

// Estados de Envíos Logísticos
export const ShipmentStatusSchema = z.enum([
  'REQUESTED',
  'RESERVED',
  'LOADING',
  'IN_TRANSIT',
  'REROUTING',
  'DELIVERED',
  'LOST',
  'CANCELLED'
]);

export const ShipmentDTOSchema = z.object({
  id: ShipmentIdSchema,
  originId: FacilityIdSchema,
  destinationId: FacilityIdSchema,
  cargoLotIds: z.array(LotIdSchema).min(1),
  status: ShipmentStatusSchema,
  routeVersion: z.number().int().nonnegative(),
  departureUtc: z.string().datetime(),
  arrivalEtaUtc: z.string().datetime(),
  idempotencyKey: z.string().min(8).max(128)
});

// Comandos de Cliente
export const ClientCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('PING'),
    timestamp: z.number().finite()
  }),
  z.object({
    type: z.literal('REQUEST_SYNC'),
    planetId: PlanetIdSchema,
    sinceSequence: z.number().int().nonnegative().optional()
  }),
  z.object({
    type: z.literal('DISPATCH_SHIPMENT'),
    idempotencyKey: z.string().min(8).max(128),
    originId: FacilityIdSchema,
    destinationId: FacilityIdSchema,
    resourceId: ResourceIdSchema,
    amount: z.number().int().positive().max(1000000)
  }),
  z.object({
    type: z.literal('DECLARE_SECESSION'),
    idempotencyKey: z.string().min(8).max(128),
    cityId: CityIdSchema
  }),
  z.object({
    type: z.literal('PROPOSE_TREATY'),
    idempotencyKey: z.string().min(8).max(128),
    targetFactionId: FactionIdSchema,
    terms: z.string().max(2048)
  })
]);

// Mensajes y Eventos del Servidor
export const ServerMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('PONG'),
    timestamp: z.number().finite(),
    serverTimeUtc: z.string().datetime()
  }),
  z.object({
    type: z.literal('SYNC_SNAPSHOT'),
    epoch: z.number().int().positive(),
    sequence: z.number().int().nonnegative(),
    planet: PlanetDefinitionSchema,
    inventories: z.array(InventoryLotDTOSchema),
    shipments: z.array(ShipmentDTOSchema)
  }),
  z.object({
    type: z.literal('EVENT_NOTIFICATION'),
    sequence: z.number().int().positive(),
    eventType: z.string().min(3).max(64),
    payload: z.unknown()
  }),
  z.object({
    type: z.literal('ERROR'),
    code: z.string().min(3).max(64),
    message: z.string(),
    requestId: z.string().optional()
  })
]);

export type ValidatedClientCommand = z.infer<typeof ClientCommandSchema>;
export type ValidatedServerMessage = z.infer<typeof ServerMessageSchema>;
