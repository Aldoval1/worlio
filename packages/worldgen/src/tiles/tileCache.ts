import type { TerrainSampler } from '../terrainSampler.js';
import { generateTileGeometry } from './tileGeometry.js';
import { createTileId } from './topology.js';
import type { TileGeometryData, TileId, TileKey } from './types.js';

/**
 * Caché LRU en memoria para geometrías de teselas generadas.
 * Garantiza determinismo estricto e independencia total del orden de solicitud.
 */
export class TileGeometryCache {
  private readonly cache = new Map<TileId, TileGeometryData>();
  private readonly maxCapacity: number;

  constructor(maxCapacity: number = 512) {
    this.maxCapacity = Math.max(1, maxCapacity);
  }

  public get(tileId: TileId): TileGeometryData | undefined {
    const data = this.cache.get(tileId);
    if (!data) return undefined;

    // Actualizar orden LRU (re-insertar al final)
    this.cache.delete(tileId);
    this.cache.set(tileId, data);
    return data;
  }

  public set(tileId: TileId, data: TileGeometryData): void {
    if (this.cache.has(tileId)) {
      this.cache.delete(tileId);
    } else if (this.cache.size >= this.maxCapacity) {
      // Desalojar el elemento menos recientemente usado (primer elemento del Map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(tileId, data);
  }

  public has(tileId: TileId): boolean {
    return this.cache.has(tileId);
  }

  public getOrCreate(
    key: TileKey,
    sampler: TerrainSampler,
    radiusMeters: number
  ): TileGeometryData {
    const id = createTileId(key);
    const existing = this.get(id);
    if (existing) return existing;

    const generated = generateTileGeometry(key, sampler, radiusMeters);
    this.set(id, generated);
    return generated;
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }

  public capacity(): number {
    return this.maxCapacity;
  }
}
