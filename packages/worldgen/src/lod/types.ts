import type { Vector3D } from '@universo/shared';
import type { CubeFace } from '../cubeSphere.js';
import type { TileBounds, TileId, TileKey } from '../tiles/types.js';

export type LodNodeState = 'ACTIVE_LEAF' | 'SPLITTING' | 'SPLIT' | 'MERGING';

export interface LodNode {
  key: TileKey;
  id: TileId;
  face: CubeFace;
  level: number;
  bounds: TileBounds;
  center: Vector3D;
  boundingRadiusMeters: number;
  geometricErrorMeters: number;
  state: LodNodeState;
  parent: LodNode | null;
  children: [LodNode, LodNode, LodNode, LodNode] | null;
}

export interface LodCameraState {
  position: Vector3D; // Posición ECEF de la cámara en metros
  forward: Vector3D; // Vector dirección frontal normalizado
  fovRadians: number;
  viewportHeightPixels: number;
}

export interface LodEvaluationConfig {
  maxLevel: number;
  targetScreenSpaceErrorPixels: number;
  splitThreshold: number;
  mergeHysteresisFactor: number; // Factor > 1.0 (ej. 1.35) para prevenir oscilaciones de split/merge
  enforce2To1Balance: boolean; // Restricción de diferencia máxima de 1 nivel entre vecinos
  enableHorizonCulling: boolean;
  maxConcurrentGenerations: number;
  skirtHeightRatio: number;
}

export interface LodStreamingStats {
  activeLeavesCount: number;
  residentTilesCount: number;
  pendingJobsCount: number;
  completedJobsCount: number;
  cancelledJobsCount: number;
  culledByHorizonCount: number;
  maxActiveLevel: number;
}

export interface TileGenerationJob {
  key: TileKey;
  id: TileId;
  priority: number; // SSE proyectado (mayor número = mayor prioridad)
  isCancelled: boolean;
  createdAt: number;
}
