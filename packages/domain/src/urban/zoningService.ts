import type { Vector3D } from '@universo/shared';
import type { RoadEdge } from '../roads/types.js';
import type { Parcel, ZoneType } from './types.js';

export interface ParcelGenerationOptions {
  parcelWidthMeters?: number; // Ancho de fachada de la parcela (default 16 m)
  parcelDepthMeters?: number; // Fondo de la parcela (default 20 m)
  tileId?: string;
}

export class ZoningService {
  private nextParcelSeq = 1;

  /**
   * Genera automáticamente una cuadrícula de parcelas a ambos lados de una carretera,
   * orientadas con acceso directo a la calzada.
   */
  public generateParcelsAlongRoad(
    edge: RoadEdge,
    options: ParcelGenerationOptions = {}
  ): Parcel[] {
    const width = options.parcelWidthMeters ?? 16.0;
    const depth = options.parcelDepthMeters ?? 20.0;
    const tileId = options.tileId ?? 'tile_urban_1';

    const parcels: Parcel[] = [];
    const samples = edge.samples;
    if (samples.length < 2) return parcels;

    const lateralOffset = edge.widthMeters * 0.5 + depth * 0.5;
    let accumulatedDist = 0;
    let lastParcelDist = 0;

    for (let i = 0; i < samples.length - 1; i++) {
      const p0 = samples[i]!;
      const p1 = samples[i + 1]!;

      const segDx = p1.x - p0.x;
      const segDy = p1.y - p0.y;
      const segDz = p1.z - p0.z;
      const segLen = Math.hypot(segDx, segDy, segDz);
      if (segLen < 1e-4) continue;

      accumulatedDist += segLen;

      // Colocar parcelas espaciadas exactamente cada `width` metros a lo largo del trazado
      while (accumulatedDist - lastParcelDist >= width) {
        lastParcelDist += width;

        // Proporción de interpolación dentro del segmento actual
        const distFromP0 = segLen - (accumulatedDist - lastParcelDist);
        const t = Math.max(0.0, Math.min(1.0, distFromP0 / segLen));

        const posX = p0.x + t * segDx;
        const posY = p0.y + t * segDy;
        const posZ = p0.z + t * segDz;

        // Vector tangente
        const tx = segDx / segLen;
        const ty = segDy / segLen;
        const tz = segDz / segLen;

        // Normal radial UP
        const rLen = Math.hypot(posX, posY, posZ);
        const ux = posX / rLen;
        const uy = posY / rLen;
        const uz = posZ / rLen;

        // Vector lateral RIGHT = T x Up
        let rx = ty * uz - tz * uy;
        let ry = tz * ux - tx * uz;
        let rz = tx * uy - ty * ux;
        const latLen = Math.max(1e-5, Math.hypot(rx, ry, rz));
        rx /= latLen;
        ry /= latLen;
        rz /= latLen;

        // Parcela lado Izquierdo
        const leftCenter: Vector3D = {
          x: posX - rx * lateralOffset,
          y: posY - ry * lateralOffset,
          z: posZ - rz * lateralOffset
        };
        const leftForward: Vector3D = { x: rx, y: ry, z: rz }; // Mira hacia la carretera

        parcels.push({
          parcelId: `parcel_${edge.edgeId}_L_${this.nextParcelSeq++}`,
          tileId,
          roadEdgeId: edge.edgeId,
          zoneType: 'UNZONED',
          status: 'VACANT',
          center: leftCenter,
          forward: leftForward,
          widthMeters: width,
          depthMeters: depth,
          densityLevel: 1
        });

        // Parcela lado Derecho
        const rightCenter: Vector3D = {
          x: posX + rx * lateralOffset,
          y: posY + ry * lateralOffset,
          z: posZ + rz * lateralOffset
        };
        const rightForward: Vector3D = { x: -rx, y: -ry, z: -rz }; // Mira hacia la carretera

        parcels.push({
          parcelId: `parcel_${edge.edgeId}_R_${this.nextParcelSeq++}`,
          tileId,
          roadEdgeId: edge.edgeId,
          zoneType: 'UNZONED',
          status: 'VACANT',
          center: rightCenter,
          forward: rightForward,
          widthMeters: width,
          depthMeters: depth,
          densityLevel: 1
        });
      }
    }

    return parcels;
  }

  /**
   * Asigna una zona R/C/I a un conjunto de parcelas.
   */
  public applyZoning(parcels: Parcel[], zoneType: ZoneType): void {
    for (const p of parcels) {
      if (p.status === 'VACANT' || p.status === 'ABANDONED') {
        p.zoneType = zoneType;
      }
    }
  }
}
