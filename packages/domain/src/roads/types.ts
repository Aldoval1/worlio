import type { Vector3D } from '@universo/shared';

export type RoadType = 'DIRT_TRACK' | 'GRAVEL_ROAD' | 'PAVED_ROAD' | 'HIGHWAY';

export interface RoadTypeProperties {
  type: RoadType;
  name: string;
  widthMeters: number;
  speedLimitKmH: number;
  maxGradePercent: number; // Pendiente máxima permitida (ej. 12% para autopistas, 25% para caminos de tierra)
  costPerMeter: number;
}

export const ROAD_TYPE_PROPERTIES: Record<RoadType, RoadTypeProperties> = {
  DIRT_TRACK: {
    type: 'DIRT_TRACK',
    name: 'Camino de Tierra',
    widthMeters: 4.0,
    speedLimitKmH: 30,
    maxGradePercent: 25.0,
    costPerMeter: 5.0
  },
  GRAVEL_ROAD: {
    type: 'GRAVEL_ROAD',
    name: 'Carretera de Grava',
    widthMeters: 6.0,
    speedLimitKmH: 50,
    maxGradePercent: 18.0,
    costPerMeter: 15.0
  },
  PAVED_ROAD: {
    type: 'PAVED_ROAD',
    name: 'Carretera Asfaltada',
    widthMeters: 8.0,
    speedLimitKmH: 80,
    maxGradePercent: 12.0,
    costPerMeter: 45.0
  },
  HIGHWAY: {
    type: 'HIGHWAY',
    name: 'Autovía / Autopista',
    widthMeters: 14.0,
    speedLimitKmH: 120,
    maxGradePercent: 7.0,
    costPerMeter: 120.0
  }
};

export interface RoadNode {
  nodeId: string;
  position: Vector3D; // Coordenadas geocéntricas ECEF (m)
  elevationMeters: number;
  connectedEdgeIds: string[];
}

export interface RoadEdge {
  edgeId: string;
  startNodeId: string;
  endNodeId: string;
  roadType: RoadType;
  widthMeters: number;
  speedLimitKmH: number;
  lengthMeters: number;
  controlPoints: Vector3D[]; // Puntos de control de la curva spline
  samples: Vector3D[]; // Puntos densos interpolados y proyectados al relieve
  maxGradePercent: number; // Pendiente máxima registrada a lo largo del tramo
}

export interface RoadGraphSerialized {
  nodes: RoadNode[];
  edges: RoadEdge[];
  version: number;
}
