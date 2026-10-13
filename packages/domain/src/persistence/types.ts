export type RoadType = 'DIRT_TRACK' | 'GRAVEL_ROAD' | 'PAVED_ROAD' | 'HIGHWAY';

export interface TileTerrainModification {
  tileId: string;
  vertexIndex: number;
  heightDeltaMeters: number; // Modificación vertical (+ terraplén, - excavación)
  biomeOverride?: string; // Modificación opcional de bioma (ej. cantera, pavimento)
}

export interface RoadSegment {
  roadId: string;
  tileId: string;
  roadType: RoadType;
  uStart: number;
  vStart: number;
  uEnd: number;
  vEnd: number;
  widthMeters: number;
  condition: number; // 0.0 (en ruinas) a 1.0 (óptimo)
  createdAtTick: number;
}

export interface TileResourceDeposit {
  depositId: string;
  tileId: string;
  resourceId: string; // 'TIMBER' | 'IRON_ORE' | 'STONE' | 'COAL' | 'WATER'
  initialReserve: number;
  currentReserve: number;
  depletedAmount: number;
  isDepleted: boolean;
  lastExtractedTick: number;
}

export interface TilePersistedState {
  tileId: string;
  version: number;
  lastModifiedTick: number;
  modifications: TileTerrainModification[];
  roads: RoadSegment[];
  deposits: TileResourceDeposit[];
}
