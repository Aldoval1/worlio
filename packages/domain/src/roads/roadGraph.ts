import type { Vector3D } from '@universo/shared';
import {
  projectSplineOnTerrain,
  type TerrainElevationQuery
} from './spline.js';
import {
  ROAD_TYPE_PROPERTIES,
  type RoadEdge,
  type RoadGraphSerialized,
  type RoadNode,
  type RoadType
} from './types.js';

export interface RoadPathResult {
  pathNodeIds: string[];
  pathEdgeIds: string[];
  totalDistanceMeters: number;
  estimatedTravelTimeSeconds: number;
}

export class RoadNetworkGraph {
  public readonly nodes = new Map<string, RoadNode>();
  public readonly edges = new Map<string, RoadEdge>();
  public version = 1;

  private nextNodeSeq = 1;
  private nextEdgeSeq = 1;

  /**
   * Obtiene un nodo existente si la posición está a menos de `snapDistanceMeters`,
   * o crea un nodo nuevo (Snapping de intersección vial).
   */
  public getOrCreateNode(
    position: Vector3D,
    elevationMeters: number,
    snapDistanceMeters = 5.0
  ): RoadNode {
    for (const node of this.nodes.values()) {
      const dist = Math.hypot(
        node.position.x - position.x,
        node.position.y - position.y,
        node.position.z - position.z
      );
      if (dist <= snapDistanceMeters) {
        return node;
      }
    }

    const nodeId = `node_${this.nextNodeSeq++}`;
    const newNode: RoadNode = {
      nodeId,
      position: { ...position },
      elevationMeters,
      connectedEdgeIds: []
    };

    this.nodes.set(nodeId, newNode);
    this.version++;
    return newNode;
  }

  /**
   * Añade una arista (carretera continua o curva) proyectada sobre el relieve.
   */
  public addRoad(
    startPos: Vector3D,
    endPos: Vector3D,
    roadType: RoadType,
    sampler: TerrainElevationQuery,
    planetRadiusMeters: number,
    intermediateControlPoints: Vector3D[] = [],
    snapDistanceMeters = 5.0
  ): RoadEdge {
    // 1. Obtener o crear nodos en extremos con auto-snapping
    const startSample = sampler.sample(
      startPos.x / Math.hypot(startPos.x, startPos.y, startPos.z),
      startPos.y / Math.hypot(startPos.x, startPos.y, startPos.z),
      startPos.z / Math.hypot(startPos.x, startPos.y, startPos.z)
    );
    const endSample = sampler.sample(
      endPos.x / Math.hypot(endPos.x, endPos.y, endPos.z),
      endPos.y / Math.hypot(endPos.x, endPos.y, endPos.z),
      endPos.z / Math.hypot(endPos.x, endPos.y, endPos.z)
    );

    const startNode = this.getOrCreateNode(startPos, startSample.heightMeters, snapDistanceMeters);
    const endNode = this.getOrCreateNode(endPos, endSample.heightMeters, snapDistanceMeters);

    if (startNode.nodeId === endNode.nodeId) {
      throw new Error('El nodo de inicio y destino no pueden ser el mismo (bucle degenerado).');
    }

    // 2. Puntos de control de la curva completa
    const controlPoints: Vector3D[] = [
      startNode.position,
      ...intermediateControlPoints,
      endNode.position
    ];

    // 3. Evaluar y proyectar spline
    const splineResult = projectSplineOnTerrain(controlPoints, sampler, planetRadiusMeters);

    // 4. Validar pendiente frente al límite del tipo de carretera
    const roadProps = ROAD_TYPE_PROPERTIES[roadType];
    if (splineResult.maxGradePercent > roadProps.maxGradePercent * 1.5) {
      throw new Error(
        `Pendiente excesiva (${splineResult.maxGradePercent}%). El límite para ${roadProps.name} es ${roadProps.maxGradePercent}%. Requiere desmonte o terraplén.`
      );
    }

    // 5. Crear arista
    const edgeId = `edge_${this.nextEdgeSeq++}`;
    const newEdge: RoadEdge = {
      edgeId,
      startNodeId: startNode.nodeId,
      endNodeId: endNode.nodeId,
      roadType,
      widthMeters: roadProps.widthMeters,
      speedLimitKmH: roadProps.speedLimitKmH,
      lengthMeters: Number(splineResult.lengthMeters.toFixed(2)),
      controlPoints,
      samples: splineResult.samples,
      maxGradePercent: splineResult.maxGradePercent
    };

    startNode.connectedEdgeIds.push(edgeId);
    endNode.connectedEdgeIds.push(edgeId);

    this.edges.set(edgeId, newEdge);
    this.version++;

    return newEdge;
  }

  /**
   * Algoritmo A* para encontrar la ruta óptima de conectividad vial entre dos nodos.
   * Minimiza el tiempo de tránsito físico (distancia / velocidad máxima).
   */
  public findPath(startNodeId: string, endNodeId: string): RoadPathResult | null {
    if (!this.nodes.has(startNodeId) || !this.nodes.has(endNodeId)) {
      return null;
    }
    if (startNodeId === endNodeId) {
      return {
        pathNodeIds: [startNodeId],
        pathEdgeIds: [],
        totalDistanceMeters: 0,
        estimatedTravelTimeSeconds: 0
      };
    }

    const openSet = new Set<string>([startNodeId]);
    const cameFrom = new Map<string, { prevNodeId: string; edgeId: string }>();

    const gScore = new Map<string, number>(); // Tiempo acumulado en segundos
    gScore.set(startNodeId, 0);

    const targetNode = this.nodes.get(endNodeId)!;

    const h = (nodeId: string): number => {
      const node = this.nodes.get(nodeId)!;
      const straightDist = Math.hypot(
        node.position.x - targetNode.position.x,
        node.position.y - targetNode.position.y,
        node.position.z - targetNode.position.z
      );
      // Heurística admisible: distancia euclídea a velocidad máxima de 120 km/h (33.33 m/s)
      return straightDist / 33.33;
    };

    const fScore = new Map<string, number>();
    fScore.set(startNodeId, h(startNodeId));

    while (openSet.size > 0) {
      // Obtener nodo con menor fScore
      let currentId: string | null = null;
      let lowestF = Infinity;
      for (const id of openSet) {
        const score = fScore.get(id) ?? Infinity;
        if (score < lowestF) {
          lowestF = score;
          currentId = id;
        }
      }

      if (!currentId) break;

      if (currentId === endNodeId) {
        // Reconstruir camino
        const pathNodeIds = [endNodeId];
        const pathEdgeIds: string[] = [];
        let curr = endNodeId;
        let totalDist = 0;
        let totalTime = 0;

        while (cameFrom.has(curr)) {
          const step = cameFrom.get(curr)!;
          pathNodeIds.unshift(step.prevNodeId);
          pathEdgeIds.unshift(step.edgeId);

          const edge = this.edges.get(step.edgeId)!;
          totalDist += edge.lengthMeters;
          totalTime += edge.lengthMeters / ((edge.speedLimitKmH * 1000) / 3600);

          curr = step.prevNodeId;
        }

        return {
          pathNodeIds,
          pathEdgeIds,
          totalDistanceMeters: Number(totalDist.toFixed(2)),
          estimatedTravelTimeSeconds: Number(totalTime.toFixed(2))
        };
      }

      openSet.delete(currentId);
      const currentNode = this.nodes.get(currentId)!;

      for (const edgeId of currentNode.connectedEdgeIds) {
        const edge = this.edges.get(edgeId)!;
        const neighborId =
          edge.startNodeId === currentId ? edge.endNodeId : edge.startNodeId;

        const speedMetersPerSec = (edge.speedLimitKmH * 1000) / 3600;
        const edgeTimeSec = edge.lengthMeters / speedMetersPerSec;
        const tentativeG = (gScore.get(currentId) ?? Infinity) + edgeTimeSec;

        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, { prevNodeId: currentId, edgeId });
          gScore.set(neighborId, tentativeG);
          fScore.set(neighborId, tentativeG + h(neighborId));

          openSet.add(neighborId);
        }
      }
    }

    return null; // Sin conectividad vial
  }

  public serialize(): RoadGraphSerialized {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      version: this.version
    };
  }

  public static deserialize(data: RoadGraphSerialized): RoadNetworkGraph {
    const graph = new RoadNetworkGraph();
    graph.version = data.version;

    for (const node of data.nodes) {
      graph.nodes.set(node.nodeId, { ...node, connectedEdgeIds: [...node.connectedEdgeIds] });
      const seq = parseInt(node.nodeId.replace('node_', ''), 10);
      if (!isNaN(seq) && seq >= graph.nextNodeSeq) {
        graph.nextNodeSeq = seq + 1;
      }
    }

    for (const edge of data.edges) {
      graph.edges.set(edge.edgeId, {
        ...edge,
        controlPoints: [...edge.controlPoints],
        samples: [...edge.samples]
      });
      const seq = parseInt(edge.edgeId.replace('edge_', ''), 10);
      if (!isNaN(seq) && seq >= graph.nextEdgeSeq) {
        graph.nextEdgeSeq = seq + 1;
      }
    }

    return graph;
  }
}
