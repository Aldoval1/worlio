import type { Vector3D } from '@universo/shared';
import type { CubeFace } from '../cubeSphere.js';

export type TileDirection = 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';
export type CardinalDirection = 'NORTH' | 'SOUTH' | 'WEST' | 'EAST';
export type AnyTileDirection = TileDirection | CardinalDirection;

export interface TileKey {
  planetId: string;
  face: CubeFace;
  level: number;
  x: number;
  y: number;
}

export type TileId = string;

export interface TileBounds {
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
}

export interface TileNeighborResult {
  neighbor: TileKey;
  targetEdge: TileDirection;
  crossesFace: boolean;
  inverted: boolean;
}

export interface TileGeometryData {
  key: TileKey;
  id: TileId;
  bounds: TileBounds;
  center: Vector3D;
  localAnchor: Vector3D;
  positions: Float32Array; // Relativo al localAnchor en metros
  worldPositions: Float64Array; // Posiciones ECEF absolutas en metros (CPU double precision)
  normals: Float32Array;
  colors: Float32Array;
  heights: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
  triangleCount: number;
}

export interface DiscontinuityReport {
  isContinuous: boolean;
  maxDistanceMeters: number;
  edgeLengthMeters: number;
  vertexCount: number;
  mismatchedVertices: number;
  details?: string;
}
