import {
  Color3,
  Mesh,
  StandardMaterial,
  VertexData,
  type Camera,
  type Scene
} from '@babylonjs/core';
import type { PlanetDefinition } from '@universo/shared';
import {
  LodQuadtree,
  TerrainSampler,
  TileGeometryCache,
  addTileSkirts,
  type LodCameraState,
  type LodEvaluationConfig,
  type LodStreamingStats,
  type TileGeometryData,
  type TileId
} from '@universo/worldgen';

export interface PlanetLodManagerOptions {
  config?: Partial<LodEvaluationConfig>;
  cacheCapacity?: number;
  useSkirts?: boolean;
  wireframe?: boolean;
}

export class PlanetLodManager {
  public readonly scene: Scene;
  public readonly planet: PlanetDefinition;
  public readonly quadtree: LodQuadtree;
  public readonly cache: TileGeometryCache;
  public readonly sampler: TerrainSampler;

  private readonly rootMesh: Mesh;
  private readonly landMaterial: StandardMaterial;
  private readonly activeMeshes = new Map<TileId, Mesh>();
  private readonly useSkirts: boolean;

  constructor(
    scene: Scene,
    planet: PlanetDefinition,
    options: PlanetLodManagerOptions = {}
  ) {
    this.scene = scene;
    this.planet = planet;
    this.useSkirts = options.useSkirts ?? true;
    this.sampler = new TerrainSampler(planet);
    this.cache = new TileGeometryCache(options.cacheCapacity ?? 256);
    this.quadtree = new LodQuadtree(planet.planetId, planet.radiusMeters, options.config);

    this.rootMesh = new Mesh(`planet_lod_${planet.planetId}`, scene);

    this.landMaterial = new StandardMaterial(`lod_land_${planet.planetId}`, scene);
    this.landMaterial.specularColor = new Color3(0.05, 0.05, 0.05);
    this.landMaterial.wireframe = options.wireframe ?? false;

    // Precargar las 6 raíces de nivel 0
    this.initializeRoots();
  }

  private initializeRoots(): void {
    for (const rootNode of this.quadtree.roots.values()) {
      const geom = this.cache.getOrCreate(
        rootNode.key,
        this.sampler,
        this.planet.radiusMeters
      );
      this.createMeshForTile(geom);
      this.quadtree.markTileReady(rootNode.id);
    }
  }

  /**
   * Actualiza el estado del LOD basado en la cámara activa y procesa
   * el presupuesto de streaming del frame actual.
   */
  public update(camera: Camera): LodStreamingStats {
    const cameraState: LodCameraState = {
      position: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      },
      forward: {
        x: camera.getForwardRay().direction.x,
        y: camera.getForwardRay().direction.y,
        z: camera.getForwardRay().direction.z
      },
      fovRadians: camera.fov,
      viewportHeightPixels: this.scene.getEngine().getRenderHeight() || 1080
    };

    // 1. Evaluar árbol jerárquico
    const { activeLeaves, stats } = this.quadtree.evaluate(cameraState);

    // 2. Procesar lote de la cola de streaming respetando presupuesto
    const budget = this.quadtree.config.maxConcurrentGenerations;
    const batch = this.quadtree.queue.dequeueBatch(budget);

    for (const job of batch) {
      let geom = this.cache.getOrCreate(job.key, this.sampler, this.planet.radiusMeters);
      if (this.useSkirts) {
        const skirtDepth = (geom.bounds.uMax - geom.bounds.uMin) * this.planet.radiusMeters * 0.05;
        geom = addTileSkirts(geom, skirtDepth);
      }

      this.createMeshForTile(geom);
      this.quadtree.markTileReady(job.id);
    }

    // 3. Actualizar visibilidad atómica de mallas
    const activeLeafIds = new Set<TileId>();
    for (const leaf of activeLeaves) {
      activeLeafIds.add(leaf.id);
      const mesh = this.activeMeshes.get(leaf.id);
      if (mesh && !mesh.isEnabled()) {
        mesh.setEnabled(true);
      }
    }

    for (const [id, mesh] of this.activeMeshes.entries()) {
      if (!activeLeafIds.has(id) && mesh.isEnabled()) {
        mesh.setEnabled(false);
      }
    }

    return stats;
  }

  private createMeshForTile(geom: TileGeometryData): Mesh {
    const existing = this.activeMeshes.get(geom.id);
    if (existing) return existing;

    const mesh = new Mesh(`tile_${geom.id}`, this.scene);
    mesh.parent = this.rootMesh;
    mesh.material = this.landMaterial;

    // Posicionar la malla en su ancla local para mitigación de jitter Float32
    mesh.position.set(geom.localAnchor.x, geom.localAnchor.y, geom.localAnchor.z);

    const vertexData = new VertexData();
    vertexData.positions = Array.from(geom.positions);
    vertexData.normals = Array.from(geom.normals);
    vertexData.colors = Array.from(geom.colors);
    vertexData.indices = Array.from(geom.indices);
    vertexData.applyToMesh(mesh);

    this.activeMeshes.set(geom.id, mesh);
    return mesh;
  }

  public getActiveMeshCount(): number {
    let count = 0;
    for (const mesh of this.activeMeshes.values()) {
      if (mesh.isEnabled()) count++;
    }
    return count;
  }

  public dispose(): void {
    for (const mesh of this.activeMeshes.values()) {
      mesh.dispose();
    }
    this.activeMeshes.clear();
    this.rootMesh.dispose();
    this.landMaterial.dispose();
    this.cache.clear();
    this.quadtree.clear();
  }
}
