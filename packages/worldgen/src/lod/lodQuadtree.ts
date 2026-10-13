import type { CubeFace } from '../cubeSphere.js';
import { CUBE_FACES } from '../cubeSphere.js';
import { createTileId, getTileBounds, getTileChildren, getTileNeighbor } from '../tiles/topology.js';
import type { TileId, TileKey } from '../tiles/types.js';
import {
  calculateGeometricError,
  calculateScreenSpaceError,
  calculateTileBoundingSphere,
  isOccludedByPlanetaryHorizon
} from './lodMetrics.js';
import { StreamingJobQueue } from './streamingQueue.js';
import type {
  LodCameraState,
  LodEvaluationConfig,
  LodNode,
  LodStreamingStats
} from './types.js';

export const DEFAULT_LOD_CONFIG: LodEvaluationConfig = {
  maxLevel: 14,
  targetScreenSpaceErrorPixels: 3.0,
  splitThreshold: 1.0,
  mergeHysteresisFactor: 1.35,
  enforce2To1Balance: true,
  enableHorizonCulling: true,
  maxConcurrentGenerations: 4,
  skirtHeightRatio: 0.05
};

export class LodQuadtree {
  public readonly planetId: string;
  public readonly planetRadiusMeters: number;
  public readonly config: LodEvaluationConfig;
  public readonly roots: Map<CubeFace, LodNode> = new Map();
  public readonly queue: StreamingJobQueue = new StreamingJobQueue();

  private culledHorizonCount = 0;
  private activeLeaves: LodNode[] = [];
  private residentTileIds: Set<TileId> = new Set();

  constructor(
    planetId: string,
    planetRadiusMeters: number,
    config: Partial<LodEvaluationConfig> = {}
  ) {
    this.planetId = planetId;
    this.planetRadiusMeters = planetRadiusMeters;
    this.config = { ...DEFAULT_LOD_CONFIG, ...config };

    this.initializeRoots();
  }

  private initializeRoots(): void {
    for (const face of CUBE_FACES) {
      const key: TileKey = { planetId: this.planetId, face, level: 0, x: 0, y: 0 };
      const bounds = getTileBounds(key);
      const { center, radiusMeters } = calculateTileBoundingSphere(
        bounds,
        face,
        this.planetRadiusMeters
      );

      const node: LodNode = {
        key,
        id: createTileId(key),
        face,
        level: 0,
        bounds,
        center,
        boundingRadiusMeters: radiusMeters,
        geometricErrorMeters: calculateGeometricError(this.planetRadiusMeters, 0),
        state: 'ACTIVE_LEAF',
        parent: null,
        children: null
      };

      this.roots.set(face, node);
      // Las raíces de nivel 0 están listas por defecto
      this.residentTileIds.add(node.id);
    }
  }

  /**
   * Notifica al árbol que una tesela ha sido generada en memoria y está lista para render.
   */
  public markTileReady(tileId: TileId): void {
    this.residentTileIds.add(tileId);
  }

  /**
   * Evalúa la cámara frente al quadtree de las 6 caras del planeta.
   * Realiza cálculo de SSE, histéresis contra parpadeo, descarte por horizonte,
   * restricción de balance 2:1 y garantiza sustitución atómica padre<->hijos.
   */
  public evaluate(camera: LodCameraState): {
    activeLeaves: LodNode[];
    stats: LodStreamingStats;
  } {
    this.culledHorizonCount = 0;
    this.activeLeaves = [];
    const neededTileIds = new Set<TileId>();

    // 1. Recorrer y evaluar cada cara del cubo
    for (const root of this.roots.values()) {
      this.evaluateNode(root, camera, neededTileIds);
    }

    // 2. Aplicar restricción de balance 2:1 si está habilitada
    if (this.config.enforce2To1Balance) {
      this.enforce2To1Constraint(neededTileIds);
    }

    // 3. Cancelar trabajos en la cola que ya no sean relevantes
    this.queue.cancelStaleJobs(neededTileIds);

    // 4. Calcular estadísticas de streaming
    let maxLvl = 0;
    for (const leaf of this.activeLeaves) {
      if (leaf.level > maxLvl) maxLvl = leaf.level;
    }

    const stats: LodStreamingStats = {
      activeLeavesCount: this.activeLeaves.length,
      residentTilesCount: this.residentTileIds.size,
      pendingJobsCount: this.queue.pendingCount,
      completedJobsCount: this.queue.completedTotal,
      cancelledJobsCount: this.queue.cancelledTotal,
      culledByHorizonCount: this.culledHorizonCount,
      maxActiveLevel: maxLvl
    };

    return {
      activeLeaves: this.activeLeaves,
      stats
    };
  }

  private evaluateNode(
    node: LodNode,
    camera: LodCameraState,
    neededIds: Set<TileId>
  ): void {
    neededIds.add(node.id);

    // Prueba de horizonte planetario
    if (this.config.enableHorizonCulling) {
      const occluded = isOccludedByPlanetaryHorizon(
        node.center,
        node.boundingRadiusMeters,
        camera.position,
        this.planetRadiusMeters
      );

      if (occluded) {
        this.culledHorizonCount++;
        // Mantener el nodo en su estado más básico como hoja activa sin subdividir
        this.activeLeaves.push(node);
        return;
      }
    }

    // Distancia cámara al centro de la tesela
    const dx = camera.position.x - node.center.x;
    const dy = camera.position.y - node.center.y;
    const dz = camera.position.z - node.center.z;
    const centerDist = Math.max(1.0, Math.hypot(dx, dy, dz));

    // Error proyectado en píxeles (SSE)
    const sse = calculateScreenSpaceError(node.geometricErrorMeters, centerDist, camera);

    const shouldSplit =
      node.level < this.config.maxLevel &&
      sse > this.config.targetScreenSpaceErrorPixels * this.config.splitThreshold;

    const shouldMerge =
      sse < this.config.targetScreenSpaceErrorPixels / this.config.mergeHysteresisFactor;

    if (shouldSplit) {
      this.ensureChildrenInstantiated(node);

      // Comprobar si los 4 hijos ya están generados y listos en memoria (Sustitución Atómica)
      const children = node.children!;
      const allChildrenReady = children.every((child) => this.residentTileIds.has(child.id));

      if (allChildrenReady) {
        // Sustitución atómica: los 4 hijos toman el relevo
        node.state = 'SPLIT';
        for (const child of children) {
          this.evaluateNode(child, camera, neededIds);
        }
      } else {
        // Encolar los hijos que aún no están listos en la cola de streaming
        node.state = 'SPLITTING';
        for (const child of children) {
          if (!this.residentTileIds.has(child.id)) {
            this.queue.enqueue({
              key: child.key,
              id: child.id,
              priority: sse
            });
            neededIds.add(child.id);
          }
        }
        // El padre PERMANECE VISIBLE hasta que todos los hijos estén listos
        this.activeLeaves.push(node);
      }
    } else if (shouldMerge && node.state === 'SPLIT') {
      // Condición de merge con histéresis: colapsar de nuevo al padre
      node.state = 'ACTIVE_LEAF';
      this.activeLeaves.push(node);
    } else if (node.state === 'SPLIT' && node.children) {
      // Continúa dividido: evaluar los hijos
      for (const child of node.children) {
        this.evaluateNode(child, camera, neededIds);
      }
    } else {
      // Permanece como hoja activa
      node.state = 'ACTIVE_LEAF';
      this.activeLeaves.push(node);
    }
  }

  private ensureChildrenInstantiated(node: LodNode): void {
    if (node.children) return;

    const childKeys = getTileChildren(node.key);
    const children: LodNode[] = childKeys.map((key) => {
      const bounds = getTileBounds(key);
      const { center, radiusMeters } = calculateTileBoundingSphere(
        bounds,
        key.face,
        this.planetRadiusMeters
      );

      return {
        key,
        id: createTileId(key),
        face: key.face,
        level: key.level,
        bounds,
        center,
        boundingRadiusMeters: radiusMeters,
        geometricErrorMeters: calculateGeometricError(this.planetRadiusMeters, key.level),
        state: 'ACTIVE_LEAF',
        parent: node,
        children: null
      };
    });

    node.children = [children[0]!, children[1]!, children[2]!, children[3]!];
  }

  /**
   * Garantiza la restricción 2:1 (diferencia de nivel <= 1 entre vecinos adyacentes).
   * Si una hoja activa vecina tiene nivel menor a (L - 1), solicita su subdivisión.
   */
  private enforce2To1Constraint(neededIds: Set<TileId>): void {
    if (this.activeLeaves.length === 0) return;

    const directions = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT'] as const;
    const activeMap = new Map<TileId, LodNode>();
    for (const leaf of this.activeLeaves) {
      activeMap.set(leaf.id, leaf);
    }

    for (const leaf of this.activeLeaves) {
      if (leaf.level < 2) continue;

      for (const dir of directions) {
        try {
          const neighborInfo = getTileNeighbor(leaf.key, dir);
          const targetLevel = leaf.level - 2;
          const factor = 4; // 2^2
          const pKey = {
            planetId: this.planetId,
            face: neighborInfo.neighbor.face,
            level: targetLevel,
            x: Math.floor(neighborInfo.neighbor.x / factor),
            y: Math.floor(neighborInfo.neighbor.y / factor)
          };
          const pId = createTileId(pKey);
          const parentLeaf = activeMap.get(pId);
          if (parentLeaf && parentLeaf.state === 'ACTIVE_LEAF') {
            this.ensureChildrenInstantiated(parentLeaf);
            for (const child of parentLeaf.children!) {
              if (!this.residentTileIds.has(child.id)) {
                this.queue.enqueue({
                  key: child.key,
                  id: child.id,
                  priority: parentLeaf.geometricErrorMeters
                });
                neededIds.add(child.id);
              }
            }
          }
        } catch {
          // Fuera de rango
        }
      }
    }
  }

  public getRoot(face: CubeFace): LodNode | undefined {
    return this.roots.get(face);
  }

  public clear(): void {
    this.queue.clear();
    this.residentTileIds.clear();
    this.roots.clear();
    this.initializeRoots();
  }
}
