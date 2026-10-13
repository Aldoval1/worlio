import { describe, expect, it } from 'vitest';
import { CUBE_FACES, type CubeFace, cubeFaceToSphereDirection } from '../cubeSphere.js';
import { CANONICAL_PLANETS } from '../planetDefinition.js';
import { TerrainSampler } from '../terrainSampler.js';
import { detectBoundaryDiscontinuities } from './crackDetector.js';
import { TileGeometryCache } from './tileCache.js';
import { generateTileGeometry } from './tileGeometry.js';
import {
  MAX_TILE_LEVEL,
  TILE_SUBDIVISIONS,
  TILE_VERTICES_PER_EDGE,
  createTileId,
  getAllTileNeighbors,
  getAncestors,
  getTileBounds,
  getTileChildren,
  getTileNeighbor,
  getTileParent,
  isValidTileKey,
  parseTileId
} from './topology.js';
import type { TileDirection, TileKey } from './types.js';

describe('T14 — Topología de teselas, quadtree y vecinos de 6 caras', () => {
  const planetId = 'TERRA_PRIME';

  describe('1. Formato canónico tileId y validación estricta', () => {
    it('serializa y parsea claves canónicas correctamente', () => {
      const key: TileKey = { planetId, face: 'PX', level: 3, x: 5, y: 2 };
      const id = createTileId(key);
      expect(id).toBe('TERRA_PRIME/PX/3/5/2');

      const parsed = parseTileId(id);
      expect(parsed).toEqual(key);
    });

    it('rechaza claves y cadenas con formato corrupto o fuera de límites', () => {
      expect(isValidTileKey({ planetId, face: 'PX', level: -1, x: 0, y: 0 })).toBe(false);
      expect(isValidTileKey({ planetId, face: 'PX', level: 1, x: 2, y: 0 })).toBe(false); // x >= 2^1
      expect(isValidTileKey({ planetId, face: 'PX', level: 1, x: 0, y: 2 })).toBe(false); // y >= 2^1
      expect(
        isValidTileKey({ planetId, face: 'INVALID' as CubeFace, level: 0, x: 0, y: 0 })
      ).toBe(false);
      expect(
        isValidTileKey({ planetId, face: 'PX', level: MAX_TILE_LEVEL + 1, x: 0, y: 0 })
      ).toBe(false);

      expect(() => parseTileId('')).toThrow();
      expect(() => parseTileId('TERRA_PRIME/PX/3/5')).toThrow();
      expect(() => parseTileId('TERRA_PRIME/PX/1/5/5')).toThrow();
    });
  });

  describe('2. Jerarquía Quadtree (Padres, Hijos, Ancestros sin ciclos)', () => {
    it('calcula padre correctamente o retorna null en nivel 0', () => {
      const root: TileKey = { planetId, face: 'PZ', level: 0, x: 0, y: 0 };
      expect(getTileParent(root)).toBeNull();

      const child: TileKey = { planetId, face: 'PZ', level: 3, x: 5, y: 2 };
      const parent = getTileParent(child);
      expect(parent).toEqual({ planetId, face: 'PZ', level: 2, x: 2, y: 1 });
    });

    it('genera 4 hijos que subdividen exactamente el espacio de la tesela padre', () => {
      const parent: TileKey = { planetId, face: 'PY', level: 2, x: 1, y: 3 };
      const children = getTileChildren(parent);

      expect(children).toHaveLength(4);
      expect(children[0]).toEqual({ planetId, face: 'PY', level: 3, x: 2, y: 6 }); // NW
      expect(children[1]).toEqual({ planetId, face: 'PY', level: 3, x: 3, y: 6 }); // NE
      expect(children[2]).toEqual({ planetId, face: 'PY', level: 3, x: 2, y: 7 }); // SW
      expect(children[3]).toEqual({ planetId, face: 'PY', level: 3, x: 3, y: 7 }); // SE

      const pBounds = getTileBounds(parent);
      const nwBounds = getTileBounds(children[0]);
      const seBounds = getTileBounds(children[3]);

      expect(nwBounds.uMin).toBeCloseTo(pBounds.uMin);
      expect(nwBounds.vMin).toBeCloseTo(pBounds.vMin);
      expect(seBounds.uMax).toBeCloseTo(pBounds.uMax);
      expect(seBounds.vMax).toBeCloseTo(pBounds.vMax);
    });

    it('recorre ancestros hasta la raíz sin ciclos a niveles extremos (0, 1, 12)', () => {
      const deepTile: TileKey = { planetId, face: 'NY', level: 12, x: 2048, y: 1024 };
      const ancestors = getAncestors(deepTile);

      expect(ancestors).toHaveLength(12);
      expect(ancestors[ancestors.length - 1]).toEqual({
        planetId,
        face: 'NY',
        level: 0,
        x: 0,
        y: 0
      });
    });
  });

  describe('3. Vecinos intra-cara e inter-cara en las 24 transiciones del cubo', () => {
    it('resuelve vecinos internos en la misma cara sin cruzar bordes', () => {
      const centerTile: TileKey = { planetId, face: 'PX', level: 2, x: 1, y: 1 };
      const neighbors = getAllTileNeighbors(centerTile);

      expect(neighbors.TOP.neighbor).toEqual({ planetId, face: 'PX', level: 2, x: 1, y: 0 });
      expect(neighbors.TOP.crossesFace).toBe(false);
      expect(neighbors.TOP.targetEdge).toBe('BOTTOM');

      expect(neighbors.BOTTOM.neighbor).toEqual({ planetId, face: 'PX', level: 2, x: 1, y: 2 });
      expect(neighbors.BOTTOM.crossesFace).toBe(false);
      expect(neighbors.BOTTOM.targetEdge).toBe('TOP');

      expect(neighbors.LEFT.neighbor).toEqual({ planetId, face: 'PX', level: 2, x: 0, y: 1 });
      expect(neighbors.LEFT.crossesFace).toBe(false);
      expect(neighbors.LEFT.targetEdge).toBe('RIGHT');

      expect(neighbors.RIGHT.neighbor).toEqual({ planetId, face: 'PX', level: 2, x: 2, y: 1 });
      expect(neighbors.RIGHT.crossesFace).toBe(false);
      expect(neighbors.RIGHT.targetEdge).toBe('LEFT');
    });

    it('resuelve las 24 aristas dirigidas inter-cara con simetría involutiva exacta', () => {
      const directions: TileDirection[] = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT'];
      const testLevel = 2; // grid 4x4
      const k = Math.pow(2, testLevel) - 1;

      for (const face of CUBE_FACES) {
        for (const dir of directions) {
          // Elegir una coordenada que se encuentre exactamente en el borde relevante
          let testX = 1;
          let testY = 1;
          if (dir === 'TOP') testY = 0;
          if (dir === 'BOTTOM') testY = k;
          if (dir === 'LEFT') testX = 0;
          if (dir === 'RIGHT') testX = k;

          const originKey: TileKey = { planetId, face, level: testLevel, x: testX, y: testY };
          const forward = getTileNeighbor(originKey, dir);

          expect(forward.crossesFace).toBe(true);
          expect(CUBE_FACES.includes(forward.neighbor.face)).toBe(true);

          // Comprobar la propiedad de vuelta (involución):
          // Si nos movemos en la dirección hacia el vecino, y desde el vecino nos movemos
          // en la dirección de su targetEdge compartida, debemos regresar exactamente al origen.
          const backward = getTileNeighbor(forward.neighbor, forward.targetEdge);
          expect(backward.neighbor).toEqual(originKey);
        }
      }
    });
  });

  describe('4. Continuidad matemática en las 8 esquinas del cubo', () => {
    it('las 3 caras que convergen en cada una de las 8 esquinas mapean al mismo vector unitario', () => {
      // Definición de las 8 esquinas del cubo en coordenadas continuas (u, v) en [-1, 1]
      const corners = [
        { name: '+++', faces: [{ f: 'PX', u: -1, v: -1 }, { f: 'PY', u: 1, v: 1 }, { f: 'PZ', u: 1, v: -1 }] },
        { name: '++-', faces: [{ f: 'PX', u: 1, v: -1 }, { f: 'PY', u: 1, v: -1 }, { f: 'NZ', u: -1, v: -1 }] },
        { name: '+-+', faces: [{ f: 'PX', u: -1, v: 1 }, { f: 'NY', u: 1, v: -1 }, { f: 'PZ', u: 1, v: 1 }] },
        { name: '+--', faces: [{ f: 'PX', u: 1, v: 1 }, { f: 'NY', u: 1, v: 1 }, { f: 'NZ', u: -1, v: 1 }] },
        { name: '-++', faces: [{ f: 'NX', u: 1, v: -1 }, { f: 'PY', u: -1, v: 1 }, { f: 'PZ', u: -1, v: -1 }] },
        { name: '-+-', faces: [{ f: 'NX', u: -1, v: -1 }, { f: 'PY', u: -1, v: -1 }, { f: 'NZ', u: 1, v: -1 }] },
        { name: '--+', faces: [{ f: 'NX', u: 1, v: 1 }, { f: 'NY', u: -1, v: -1 }, { f: 'PZ', u: -1, v: 1 }] },
        { name: '---', faces: [{ f: 'NX', u: -1, v: 1 }, { f: 'NY', u: -1, v: 1 }, { f: 'NZ', u: 1, v: 1 }] }
      ];

      for (const corner of corners) {
        const f0 = corner.faces[0]!;
        const f1 = corner.faces[1]!;
        const f2 = corner.faces[2]!;

        const d0 = cubeFaceToSphereDirection(f0.f as CubeFace, f0.u, f0.v);
        const d1 = cubeFaceToSphereDirection(f1.f as CubeFace, f1.u, f1.v);
        const d2 = cubeFaceToSphereDirection(f2.f as CubeFace, f2.u, f2.v);

        expect(d0.x).toBeCloseTo(d1.x, 6);
        expect(d0.y).toBeCloseTo(d1.y, 6);
        expect(d0.z).toBeCloseTo(d1.z, 6);

        expect(d0.x).toBeCloseTo(d2.x, 6);
        expect(d0.y).toBeCloseTo(d2.y, 6);
        expect(d0.z).toBeCloseTo(d2.z, 6);
      }
    });
  });

  describe('5. Generación de geometría de tesela y detector de grietas (Crack Detector)', () => {
    const planet = CANONICAL_PLANETS.TERRA_PRIME!;
    const sampler = new TerrainSampler(planet);
    const radiusMeters = planet.radiusMeters;

    it('genera la malla diádica de 33x33 vértices con índices y buffers correctos', () => {
      const tileKey: TileKey = { planetId, face: 'PX', level: 1, x: 0, y: 0 };
      const geom = generateTileGeometry(tileKey, sampler, radiusMeters, TILE_SUBDIVISIONS);

      expect(geom.vertexCount).toBe(TILE_VERTICES_PER_EDGE * TILE_VERTICES_PER_EDGE); // 1089
      expect(geom.triangleCount).toBe(TILE_SUBDIVISIONS * TILE_SUBDIVISIONS * 2); // 2048
      expect(geom.positions.length).toBe(1089 * 3);
      expect(geom.worldPositions.length).toBe(1089 * 3);
      expect(geom.indices.length).toBe(2048 * 3);
      expect(geom.heights.length).toBe(1089);
      expect(geom.colors.length).toBe(1089 * 4);
    });

    it('verifica ausencia total de huecos (< 0.1 mm) entre teselas adyacentes intra-cara', () => {
      const tileAKey: TileKey = { planetId, face: 'PX', level: 2, x: 1, y: 1 };
      const tileBKey: TileKey = { planetId, face: 'PX', level: 2, x: 2, y: 1 }; // Vecino RIGHT

      const geomA = generateTileGeometry(tileAKey, sampler, radiusMeters);
      const geomB = generateTileGeometry(tileBKey, sampler, radiusMeters);

      const report = detectBoundaryDiscontinuities(geomA, geomB, 'RIGHT', 1e-4);

      expect(report.isContinuous).toBe(true);
      expect(report.mismatchedVertices).toBe(0);
      expect(report.maxDistanceMeters).toBeLessThan(1e-4);
    });

    it('verifica ausencia total de huecos (< 0.1 mm) en el borde inter-cara entre PX y PZ', () => {
      // Borde izquierdo de PX colinda con borde derecho de PZ
      const tilePX: TileKey = { planetId, face: 'PX', level: 1, x: 0, y: 0 };
      const neighborInfo = getTileNeighbor(tilePX, 'LEFT');
      expect(neighborInfo.neighbor.face).toBe('PZ');

      const geomPX = generateTileGeometry(tilePX, sampler, radiusMeters);
      const geomPZ = generateTileGeometry(neighborInfo.neighbor, sampler, radiusMeters);

      const report = detectBoundaryDiscontinuities(geomPX, geomPZ, 'LEFT', 1e-4);

      expect(report.isContinuous).toBe(true);
      expect(report.mismatchedVertices).toBe(0);
      expect(report.maxDistanceMeters).toBeLessThan(1e-4);
    });

    it('verifica ausencia total de huecos (< 0.1 mm) en el borde con rotación/inversión (PX -> PY)', () => {
      // Borde superior de PX colinda con borde derecho de PY con inversión
      const tilePX: TileKey = { planetId, face: 'PX', level: 1, x: 0, y: 0 };
      const neighborInfo = getTileNeighbor(tilePX, 'TOP');
      expect(neighborInfo.neighbor.face).toBe('PY');
      expect(neighborInfo.inverted).toBe(true);

      const geomPX = generateTileGeometry(tilePX, sampler, radiusMeters);
      const geomPY = generateTileGeometry(neighborInfo.neighbor, sampler, radiusMeters);

      const report = detectBoundaryDiscontinuities(geomPX, geomPY, 'TOP', 1e-4);

      expect(report.isContinuous).toBe(true);
      expect(report.mismatchedVertices).toBe(0);
      expect(report.maxDistanceMeters).toBeLessThan(1e-4);
    });
  });

  describe('6. TileGeometryCache independiente del orden de solicitud', () => {
    const planet = CANONICAL_PLANETS.TERRA_PRIME!;
    const sampler = new TerrainSampler(planet);
    const radiusMeters = planet.radiusMeters;

    it('retorna instancias cacheadas y respeta capacidad LRU', () => {
      const cache = new TileGeometryCache(4);
      const tile1: TileKey = { planetId, face: 'PX', level: 1, x: 0, y: 0 };
      const tile2: TileKey = { planetId, face: 'PX', level: 1, x: 1, y: 0 };

      const g1 = cache.getOrCreate(tile1, sampler, radiusMeters);
      const g2 = cache.getOrCreate(tile2, sampler, radiusMeters);
      const g1Again = cache.getOrCreate(tile1, sampler, radiusMeters);

      expect(g2).toBeDefined();
      expect(g1).toBe(g1Again); // Misma referencia en memoria
      expect(cache.size()).toBe(2);

      // Desalojo al sobrepasar capacidad
      const tile3: TileKey = { planetId, face: 'PX', level: 1, x: 0, y: 1 };
      const tile4: TileKey = { planetId, face: 'PX', level: 1, x: 1, y: 1 };
      const tile5: TileKey = { planetId, face: 'PY', level: 1, x: 0, y: 0 };

      cache.getOrCreate(tile3, sampler, radiusMeters);
      cache.getOrCreate(tile4, sampler, radiusMeters);
      cache.getOrCreate(tile5, sampler, radiusMeters); // Desaloja tile2 (tile1 fue refrescado recientemente)

      expect(cache.size()).toBe(4);
      expect(cache.has(createTileId(tile2))).toBe(false);
      expect(cache.has(createTileId(tile1))).toBe(true);
    });
  });
});
