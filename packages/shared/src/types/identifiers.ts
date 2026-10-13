/**
 * Identificadores fuertemente tipados (Branded Types)
 * para entidades estables del universo.
 */

export type PlanetId = string & { readonly __brand: unique symbol };
export type RegionId = string & { readonly __brand: unique symbol };
export type CityId = string & { readonly __brand: unique symbol };
export type FacilityId = string & { readonly __brand: unique symbol };
export type RoadId = string & { readonly __brand: unique symbol };
export type LotId = string & { readonly __brand: unique symbol };
export type ShipmentId = string & { readonly __brand: unique symbol };
export type FactionId = string & { readonly __brand: unique symbol };
export type UserId = string & { readonly __brand: unique symbol };
export type ResourceId = string & { readonly __brand: unique symbol };
export type ArmyId = string & { readonly __brand: unique symbol };
export type TreatyId = string & { readonly __brand: unique symbol };

export function createPlanetId(id: string): PlanetId {
  return id as PlanetId;
}
export function createRegionId(id: string): RegionId {
  return id as RegionId;
}
export function createCityId(id: string): CityId {
  return id as CityId;
}
export function createFacilityId(id: string): FacilityId {
  return id as FacilityId;
}
export function createRoadId(id: string): RoadId {
  return id as RoadId;
}
export function createLotId(id: string): LotId {
  return id as LotId;
}
export function createShipmentId(id: string): ShipmentId {
  return id as ShipmentId;
}
export function createFactionId(id: string): FactionId {
  return id as FactionId;
}
export function createUserId(id: string): UserId {
  return id as UserId;
}
export function createResourceId(id: string): ResourceId {
  return id as ResourceId;
}
export function createArmyId(id: string): ArmyId {
  return id as ArmyId;
}
export function createTreatyId(id: string): TreatyId {
  return id as TreatyId;
}
