import type { Scene } from '@babylonjs/core';
import type { Vector3D } from '@universo/shared';
import {
  RoadNetworkGraph,
  projectSplineOnTerrain,
  ROAD_TYPE_PROPERTIES,
  type RoadEdge,
  type RoadNode,
  type RoadType,
  type TerrainElevationQuery
} from '@universo/domain';
import { createRoadRibbonMesh } from './roadMeshBuilder.js';

export interface RoadEditorOptions {
  snapDistanceMeters?: number;
}

export class RoadEditorController {
  public readonly scene: Scene;
  public readonly graph: RoadNetworkGraph;
  public readonly sampler: TerrainElevationQuery;
  public readonly planetRadiusMeters: number;
  public readonly snapDistanceMeters: number;

  public activeRoadType: RoadType = 'PAVED_ROAD';
  public currentWaypoints: Vector3D[] = [];
  public isPlacing = false;

  constructor(
    scene: Scene,
    graph: RoadNetworkGraph,
    sampler: TerrainElevationQuery,
    planetRadiusMeters: number,
    options: RoadEditorOptions = {}
  ) {
    this.scene = scene;
    this.graph = graph;
    this.sampler = sampler;
    this.planetRadiusMeters = planetRadiusMeters;
    this.snapDistanceMeters = options.snapDistanceMeters ?? 5.0;
  }

  /**
   * Inicia el trazado de un nuevo tramo de carretera en la posición del primer clic.
   */
  public startRoad(startPoint: Vector3D): void {
    this.currentWaypoints = [{ ...startPoint }];
    this.isPlacing = true;
  }

  /**
   * Añade un punto de inflexión o curvatura intermedia al trazado.
   */
  public addWaypoint(point: Vector3D): void {
    if (!this.isPlacing) return;
    this.currentWaypoints.push({ ...point });
  }

  /**
   * Finaliza el trazado en el punto especificado, proyecta la spline sobre el relieve,
   * valida la pendiente admisible, añade la arista al grafo determinista y genera su malla 3D.
   */
  public finishRoad(endPoint: Vector3D): RoadEdge {
    if (!this.isPlacing || this.currentWaypoints.length === 0) {
      throw new Error('No hay trazado de carretera activo para finalizar.');
    }

    const start = this.currentWaypoints[0]!;
    const intermediates = this.currentWaypoints.slice(1);

    const edge = this.graph.addRoad(
      start,
      endPoint,
      this.activeRoadType,
      this.sampler,
      this.planetRadiusMeters,
      intermediates,
      this.snapDistanceMeters
    );

    // Generar malla ribbon en la escena
    createRoadRibbonMesh(edge, this.scene, start);

    this.cancel();
    return edge;
  }

  /**
   * Previsualiza la geometría de la curva spline proyectada con los puntos acumulados y el cursor actual.
   */
  public previewSpline(cursorPoint: Vector3D): {
    samples: Vector3D[];
    lengthMeters: number;
    maxGradePercent: number;
    isGradeValid: boolean;
  } | null {
    if (!this.isPlacing || this.currentWaypoints.length === 0) {
      return null;
    }

    const controlPoints = [...this.currentWaypoints, cursorPoint];
    const result = projectSplineOnTerrain(
      controlPoints,
      this.sampler,
      this.planetRadiusMeters
    );

    const maxAllowed = ROAD_TYPE_PROPERTIES[this.activeRoadType].maxGradePercent;
    return {
      samples: result.samples,
      lengthMeters: result.lengthMeters,
      maxGradePercent: result.maxGradePercent,
      isGradeValid: result.maxGradePercent <= maxAllowed * 1.5
    };
  }

  /**
   * Cancela el trazado en curso.
   */
  public cancel(): void {
    this.currentWaypoints = [];
    this.isPlacing = false;
  }

  /**
   * Encuentra el nodo más cercano para auto-snapping visual del cursor en el editor.
   */
  public findSnapTarget(position: Vector3D): RoadNode | null {
    for (const node of this.graph.nodes.values()) {
      const dist = Math.hypot(
        node.position.x - position.x,
        node.position.y - position.y,
        node.position.z - position.z
      );
      if (dist <= this.snapDistanceMeters) {
        return node;
      }
    }
    return null;
  }
}
