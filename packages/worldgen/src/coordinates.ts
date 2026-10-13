import type { Vector3D } from '@universo/shared';

export interface SphericalCoordinates {
  latitudeRad: number;  // [-PI/2, PI/2]
  longitudeRad: number; // [-PI, PI]
  altitudeMeters: number;
}

export interface TangentFrameBasis {
  east: Vector3D;
  north: Vector3D;
  up: Vector3D;
}

export class PlanetaryCoordinates {
  /**
   * Convierte coordenadas esféricas (latitud, longitud, altitud) a cartesiano global (ECEF-like).
   * Convención: mano derecha, Y-arriba.
   */
  public static sphericalToCartesian(
    spherical: SphericalCoordinates,
    radiusMeters: number
  ): Vector3D {
    const { latitudeRad: lat, longitudeRad: lon, altitudeMeters: alt } = spherical;
    const r = radiusMeters + alt;
    const cosLat = Math.cos(lat);

    return {
      x: r * cosLat * Math.sin(lon),
      y: r * Math.sin(lat),
      z: r * cosLat * Math.cos(lon)
    };
  }

  /**
   * Convierte cartesiano global a coordenadas esféricas.
   */
  public static cartesianToSpherical(
    cartesian: Vector3D,
    radiusMeters: number
  ): SphericalCoordinates {
    const { x, y, z } = cartesian;
    const r = Math.hypot(x, y, z);
    if (r === 0) {
      return { latitudeRad: 0, longitudeRad: 0, altitudeMeters: -radiusMeters };
    }

    const latitudeRad = Math.asin(Math.max(-1.0, Math.min(1.0, y / r)));
    const longitudeRad = Math.atan2(x, z);
    const altitudeMeters = r - radiusMeters;

    return {
      latitudeRad,
      longitudeRad,
      altitudeMeters
    };
  }

  /**
   * Calcula la base ortonormal local Tangente (East, North, Up) en un punto geográfico,
   * con manejo de singularidades numéricas en los polos norte (+Y) y sur (-Y).
   */
  public static computeTangentBasis(latRad: number, lonRad: number): TangentFrameBasis {
    const cosLat = Math.cos(latRad);
    const sinLat = Math.sin(latRad);
    const cosLon = Math.cos(lonRad);
    const sinLon = Math.sin(lonRad);

    // Vector Up (radial saliente normalizado)
    const up: Vector3D = {
      x: cosLat * sinLon,
      y: sinLat,
      z: cosLat * cosLon
    };

    // Vector East: tangente perpendicular al meridiano hacia el este
    // En polos (|sinLat| > 0.999999), East colapsa a singularidad; aplicamos orientación estable
    let east: Vector3D;
    if (Math.abs(sinLat) > 0.999999) {
      // Polo: definir East a lo largo del eje X global
      east = { x: 1.0, y: 0.0, z: 0.0 };
    } else {
      east = {
        x: cosLon,
        y: 0.0,
        z: -sinLon
      };
    }

    // Vector North: North = Up x East (en mano derecha)
    const north: Vector3D = {
      x: up.y * east.z - up.z * east.y,
      y: up.z * east.x - up.x * east.z,
      z: up.x * east.y - up.y * east.x
    };

    return { east, north, up };
  }

  /**
   * Transforma una posición cartesiana global al marco local tangente centrado en el ancla.
   * v_local = [dx, dy, dz] proyectado en los ejes (East, North, Up) del ancla.
   */
  public static globalToLocalTangent(
    globalPoint: Vector3D,
    anchorGlobal: Vector3D,
    anchorBasis: TangentFrameBasis
  ): Vector3D {
    const dx = globalPoint.x - anchorGlobal.x;
    const dy = globalPoint.y - anchorGlobal.y;
    const dz = globalPoint.z - anchorGlobal.z;

    return {
      x: dx * anchorBasis.east.x + dy * anchorBasis.east.y + dz * anchorBasis.east.z,
      y: dx * anchorBasis.up.x + dy * anchorBasis.up.y + dz * anchorBasis.up.z,
      z: dx * anchorBasis.north.x + dy * anchorBasis.north.y + dz * anchorBasis.north.z
    };
  }

  /**
   * Transforma una posición local tangente de vuelta a coordenadas globales.
   */
  public static localTangentToGlobal(
    localPoint: Vector3D,
    anchorGlobal: Vector3D,
    anchorBasis: TangentFrameBasis
  ): Vector3D {
    return {
      x:
        anchorGlobal.x +
        localPoint.x * anchorBasis.east.x +
        localPoint.y * anchorBasis.up.x +
        localPoint.z * anchorBasis.north.x,
      y:
        anchorGlobal.y +
        localPoint.x * anchorBasis.east.y +
        localPoint.y * anchorBasis.up.y +
        localPoint.z * anchorBasis.north.y,
      z:
        anchorGlobal.z +
        localPoint.x * anchorBasis.east.z +
        localPoint.y * anchorBasis.up.z +
        localPoint.z * anchorBasis.north.z
    };
  }
}
