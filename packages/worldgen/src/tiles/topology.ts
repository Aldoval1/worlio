import { CUBE_FACES, type CubeFace } from '../cubeSphere.js';
import type {
  AnyTileDirection,
  TileBounds,
  TileDirection,
  TileId,
  TileKey,
  TileNeighborResult
} from './types.js';

export const TILE_SUBDIVISIONS = 32;
export const TILE_VERTICES_PER_EDGE = 33;
export const MAX_TILE_LEVEL = 24;

/**
 * Normaliza cualquier dirección (cardinal o de cara) al conjunto canónico: TOP, BOTTOM, LEFT, RIGHT.
 */
export function normalizeDirection(dir: AnyTileDirection): TileDirection {
  switch (dir) {
    case 'NORTH':
      return 'TOP';
    case 'SOUTH':
      return 'BOTTOM';
    case 'WEST':
      return 'LEFT';
    case 'EAST':
      return 'RIGHT';
    default:
      return dir;
  }
}

/**
 * Devuelve la dirección complementaria opuesta en el mismo marco de referencia.
 */
export function getOppositeDirection(dir: TileDirection): TileDirection {
  switch (dir) {
    case 'TOP':
      return 'BOTTOM';
    case 'BOTTOM':
      return 'TOP';
    case 'LEFT':
      return 'RIGHT';
    case 'RIGHT':
      return 'LEFT';
  }
}

/**
 * Genera el identificador canónico de tesela: `${planetId}/${face}/${level}/${x}/${y}`.
 */
export function createTileId(key: TileKey): TileId {
  return `${key.planetId}/${key.face}/${key.level}/${key.x}/${key.y}`;
}

/**
 * Valida si una clave de tesela es matemáticamente válida y está dentro de los límites del quadtree.
 */
export function isValidTileKey(key: TileKey): boolean {
  if (!key || typeof key !== 'object') return false;
  if (!key.planetId || typeof key.planetId !== 'string') return false;
  if (!CUBE_FACES.includes(key.face)) return false;
  if (!Number.isInteger(key.level) || key.level < 0 || key.level > MAX_TILE_LEVEL) return false;

  const maxCoord = Math.pow(2, key.level);
  if (!Number.isInteger(key.x) || key.x < 0 || key.x >= maxCoord) return false;
  if (!Number.isInteger(key.y) || key.y < 0 || key.y >= maxCoord) return false;

  return true;
}

/**
 * Parsea un identificador canónico de tesela a su estructura tipada TileKey.
 * Lanza un error descriptivo si el formato es inválido o excede los límites topológicos.
 */
export function parseTileId(tileId: TileId): TileKey {
  if (!tileId || typeof tileId !== 'string') {
    throw new Error(`TileId inválido: se esperaba string no vacío, recibido ${String(tileId)}`);
  }

  const parts = tileId.split('/');
  if (parts.length !== 5) {
    throw new Error(
      `Formato de tileId incorrecto: '${tileId}'. Se espera 'planetId/face/level/x/y'`
    );
  }

  const [planetId, faceStr, levelStr, xStr, yStr] = parts;
  if (!planetId || !faceStr || !levelStr || !xStr || !yStr) {
    throw new Error(`Componentes incompletos en '${tileId}'`);
  }

  const face = faceStr as CubeFace;
  const level = Number.parseInt(levelStr, 10);
  const x = Number.parseInt(xStr, 10);
  const y = Number.parseInt(yStr, 10);

  const key: TileKey = { planetId, face, level, x, y };

  if (!isValidTileKey(key)) {
    throw new Error(`Parámetros de tesela fuera de rango o corruptos en '${tileId}'`);
  }

  return key;
}

/**
 * Calcula los límites continuos (uMin, uMax, vMin, vMax) en el espacio [-1, 1] de la cara del cubo.
 */
export function getTileBounds(key: TileKey): TileBounds {
  if (!isValidTileKey(key)) {
    throw new Error(`No se pueden calcular límites para clave inválida: ${createTileId(key)}`);
  }

  const numTilesAxis = Math.pow(2, key.level);
  const tileSize = 2.0 / numTilesAxis;

  const uMin = -1.0 + key.x * tileSize;
  const uMax = -1.0 + (key.x + 1) * tileSize;
  const vMin = -1.0 + key.y * tileSize;
  const vMax = -1.0 + (key.y + 1) * tileSize;

  return { uMin, uMax, vMin, vMax };
}

/**
 * Devuelve la clave de la tesela padre en el nivel inmediatamente superior (level - 1).
 * Devuelve null si la tesela ya es la raíz de la cara (level 0).
 */
export function getTileParent(key: TileKey): TileKey | null {
  if (key.level === 0) return null;

  return {
    planetId: key.planetId,
    face: key.face,
    level: key.level - 1,
    x: Math.floor(key.x / 2),
    y: Math.floor(key.y / 2)
  };
}

/**
 * Devuelve las 4 teselas hijas en el nivel inmediatamente inferior (level + 1).
 */
export function getTileChildren(key: TileKey): [TileKey, TileKey, TileKey, TileKey] {
  if (key.level >= MAX_TILE_LEVEL) {
    throw new Error(
      `Nivel máximo de profundidad alcanzado (${MAX_TILE_LEVEL}) para ${createTileId(key)}`
    );
  }

  const nextLevel = key.level + 1;
  const baseX = key.x * 2;
  const baseY = key.y * 2;

  return [
    { planetId: key.planetId, face: key.face, level: nextLevel, x: baseX, y: baseY }, // Top-Left (NW)
    { planetId: key.planetId, face: key.face, level: nextLevel, x: baseX + 1, y: baseY }, // Top-Right (NE)
    { planetId: key.planetId, face: key.face, level: nextLevel, x: baseX, y: baseY + 1 }, // Bottom-Left (SW)
    { planetId: key.planetId, face: key.face, level: nextLevel, x: baseX + 1, y: baseY + 1 } // Bottom-Right (SE)
  ];
}

/**
 * Retorna todos los ancestros de una tesela desde su padre hasta la raíz de la cara (level 0).
 * Garantiza ausencia estricta de ciclos en la jerarquía del quadtree.
 */
export function getAncestors(key: TileKey): TileKey[] {
  const ancestors: TileKey[] = [];
  const visitedIds = new Set<string>();

  let current = getTileParent(key);
  while (current !== null) {
    const id = createTileId(current);
    if (visitedIds.has(id)) {
      throw new Error(`Ciclo detectado en la jerarquía quadtree para la tesela ${id}`);
    }
    visitedIds.add(id);
    ancestors.push(current);
    current = getTileParent(current);
  }

  return ancestors;
}

/**
 * Resuelve la tesela vecina en la dirección especificada (TOP, BOTTOM, LEFT, RIGHT)
 * tanto dentro de la misma cara (intra-cara) como a través de las 24 transiciones inter-cara del cubo.
 */
export function getTileNeighbor(key: TileKey, direction: AnyTileDirection): TileNeighborResult {
  if (!isValidTileKey(key)) {
    throw new Error(`Clave de tesela inválida para resolver vecino: ${JSON.stringify(key)}`);
  }

  const dir = normalizeDirection(direction);
  const n = Math.pow(2, key.level);
  const k = n - 1;

  let targetX = key.x;
  let targetY = key.y;

  switch (dir) {
    case 'LEFT':
      targetX = key.x - 1;
      break;
    case 'RIGHT':
      targetX = key.x + 1;
      break;
    case 'TOP':
      targetY = key.y - 1;
      break;
    case 'BOTTOM':
      targetY = key.y + 1;
      break;
  }

  // Caso 1: Vecino dentro de la misma cara (Intra-cara)
  if (targetX >= 0 && targetX < n && targetY >= 0 && targetY < n) {
    return {
      neighbor: {
        planetId: key.planetId,
        face: key.face,
        level: key.level,
        x: targetX,
        y: targetY
      },
      targetEdge: getOppositeDirection(dir),
      crossesFace: false,
      inverted: false
    };
  }

  // Caso 2: Cruce de arista a través de caras adyacentes del cubo (Inter-cara)
  return resolveInterFaceNeighbor(key, dir, k);
}

/**
 * Topología de las 24 aristas dirigidas entre las 6 caras del cubo.
 */
function resolveInterFaceNeighbor(key: TileKey, dir: TileDirection, k: number): TileNeighborResult {
  const { planetId, face, level, x, y } = key;

  switch (face) {
    case 'PX': {
      if (dir === 'LEFT') {
        return {
          neighbor: { planetId, face: 'PZ', level, x: k, y },
          targetEdge: 'RIGHT',
          crossesFace: true,
          inverted: false
        };
      }
      if (dir === 'RIGHT') {
        return {
          neighbor: { planetId, face: 'NZ', level, x: 0, y },
          targetEdge: 'LEFT',
          crossesFace: true,
          inverted: false
        };
      }
      if (dir === 'TOP') {
        return {
          neighbor: { planetId, face: 'PY', level, x: k, y: k - x },
          targetEdge: 'RIGHT',
          crossesFace: true,
          inverted: true
        };
      }
      if (dir === 'BOTTOM') {
        return {
          neighbor: { planetId, face: 'NY', level, x: k, y: x },
          targetEdge: 'RIGHT',
          crossesFace: true,
          inverted: false
        };
      }
      break;
    }

    case 'NX': {
      if (dir === 'LEFT') {
        return {
          neighbor: { planetId, face: 'NZ', level, x: k, y },
          targetEdge: 'RIGHT',
          crossesFace: true,
          inverted: false
        };
      }
      if (dir === 'RIGHT') {
        return {
          neighbor: { planetId, face: 'PZ', level, x: 0, y },
          targetEdge: 'LEFT',
          crossesFace: true,
          inverted: false
        };
      }
      if (dir === 'TOP') {
        return {
          neighbor: { planetId, face: 'PY', level, x: 0, y: x },
          targetEdge: 'LEFT',
          crossesFace: true,
          inverted: false
        };
      }
      if (dir === 'BOTTOM') {
        return {
          neighbor: { planetId, face: 'NY', level, x: 0, y: k - x },
          targetEdge: 'LEFT',
          crossesFace: true,
          inverted: true
        };
      }
      break;
    }

    case 'PZ': {
      if (dir === 'LEFT') {
        return {
          neighbor: { planetId, face: 'NX', level, x: k, y },
          targetEdge: 'RIGHT',
          crossesFace: true,
          inverted: false
        };
      }
      if (dir === 'RIGHT') {
        return {
          neighbor: { planetId, face: 'PX', level, x: 0, y },
          targetEdge: 'LEFT',
          crossesFace: true,
          inverted: false
        };
      }
      if (dir === 'TOP') {
        return {
          neighbor: { planetId, face: 'PY', level, x, y: k },
          targetEdge: 'BOTTOM',
          crossesFace: true,
          inverted: false
        };
      }
      if (dir === 'BOTTOM') {
        return {
          neighbor: { planetId, face: 'NY', level, x, y: 0 },
          targetEdge: 'TOP',
          crossesFace: true,
          inverted: false
        };
      }
      break;
    }

    case 'NZ': {
      if (dir === 'LEFT') {
        return {
          neighbor: { planetId, face: 'PX', level, x: k, y },
          targetEdge: 'RIGHT',
          crossesFace: true,
          inverted: false
        };
      }
      if (dir === 'RIGHT') {
        return {
          neighbor: { planetId, face: 'NX', level, x: 0, y },
          targetEdge: 'LEFT',
          crossesFace: true,
          inverted: false
        };
      }
      if (dir === 'TOP') {
        return {
          neighbor: { planetId, face: 'PY', level, x: k - x, y: 0 },
          targetEdge: 'TOP',
          crossesFace: true,
          inverted: true
        };
      }
      if (dir === 'BOTTOM') {
        return {
          neighbor: { planetId, face: 'NY', level, x: k - x, y: k },
          targetEdge: 'BOTTOM',
          crossesFace: true,
          inverted: true
        };
      }
      break;
    }

    case 'PY': {
      if (dir === 'LEFT') {
        return {
          neighbor: { planetId, face: 'NX', level, x: y, y: 0 },
          targetEdge: 'TOP',
          crossesFace: true,
          inverted: false
        };
      }
      if (dir === 'RIGHT') {
        return {
          neighbor: { planetId, face: 'PX', level, x: k - y, y: 0 },
          targetEdge: 'TOP',
          crossesFace: true,
          inverted: true
        };
      }
      if (dir === 'TOP') {
        return {
          neighbor: { planetId, face: 'NZ', level, x: k - x, y: 0 },
          targetEdge: 'TOP',
          crossesFace: true,
          inverted: true
        };
      }
      if (dir === 'BOTTOM') {
        return {
          neighbor: { planetId, face: 'PZ', level, x, y: 0 },
          targetEdge: 'TOP',
          crossesFace: true,
          inverted: false
        };
      }
      break;
    }

    case 'NY': {
      if (dir === 'LEFT') {
        return {
          neighbor: { planetId, face: 'NX', level, x: k - y, y: k },
          targetEdge: 'BOTTOM',
          crossesFace: true,
          inverted: true
        };
      }
      if (dir === 'RIGHT') {
        return {
          neighbor: { planetId, face: 'PX', level, x: y, y: k },
          targetEdge: 'BOTTOM',
          crossesFace: true,
          inverted: false
        };
      }
      if (dir === 'TOP') {
        return {
          neighbor: { planetId, face: 'PZ', level, x, y: k },
          targetEdge: 'BOTTOM',
          crossesFace: true,
          inverted: false
        };
      }
      if (dir === 'BOTTOM') {
        return {
          neighbor: { planetId, face: 'NZ', level, x: k - x, y: k },
          targetEdge: 'BOTTOM',
          crossesFace: true,
          inverted: true
        };
      }
      break;
    }
  }

  throw new Error(`Transición no contemplada para cara ${face} y dirección ${dir}`);
}

/**
 * Devuelve los 4 vecinos ortogonales inmediatos de la tesela en un objeto indexado por dirección.
 */
export function getAllTileNeighbors(
  key: TileKey
): Record<TileDirection, TileNeighborResult> {
  return {
    TOP: getTileNeighbor(key, 'TOP'),
    BOTTOM: getTileNeighbor(key, 'BOTTOM'),
    LEFT: getTileNeighbor(key, 'LEFT'),
    RIGHT: getTileNeighbor(key, 'RIGHT')
  };
}
