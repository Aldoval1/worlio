import { Vector3, type Camera } from '@babylonjs/core';
import type { Vector3D } from '@universo/shared';

export interface ClippingRange {
  minZ: number;
  maxZ: number;
}

export class FloatingOriginManager {
  private renderOrigin: Vector3D = { x: 0, y: 0, z: 0 };
  private readonly rebaseDistanceThreshold: number;

  constructor(rebaseDistanceThreshold = 2000.0) {
    this.rebaseDistanceThreshold = rebaseDistanceThreshold;
  }

  public getRenderOrigin(): Readonly<Vector3D> {
    return this.renderOrigin;
  }

  /**
   * Evalúa la posición de la cámara en coordenadas globales y actualiza el origen de render
   * si la distancia supera el umbral de rebase.
   */
  public updateOrigin(cameraGlobalPos: Vector3D): boolean {
    const dist = Math.hypot(
      cameraGlobalPos.x - this.renderOrigin.x,
      cameraGlobalPos.y - this.renderOrigin.y,
      cameraGlobalPos.z - this.renderOrigin.z
    );

    if (dist > this.rebaseDistanceThreshold) {
      this.renderOrigin = { ...cameraGlobalPos };
      return true; // Rebase ejecutado
    }
    return false;
  }

  /**
   * Calcula el vector de traslación que se debe asignar en GPU a una malla con ancla global A:
   * T_world = A - O
   */
  public computeLocalTranslation(anchorGlobal: Vector3D): Vector3 {
    return new Vector3(
      anchorGlobal.x - this.renderOrigin.x,
      anchorGlobal.y - this.renderOrigin.y,
      anchorGlobal.z - this.renderOrigin.z
    );
  }

  /**
   * Calcula dinámicamente los planos de recorte near/far para evitar Z-fighting y pérdida de profundidad
   */
  public computeAdaptiveClipping(altitudeMeters: number): ClippingRange {
    if (altitudeMeters > 50000) {
      // Escala Orbital (> 50 km)
      return { minZ: 500.0, maxZ: 1000000.0 };
    } else if (altitudeMeters > 2000) {
      // Escala Regional (2 km - 50 km)
      return { minZ: 10.0, maxZ: 150000.0 };
    } else if (altitudeMeters > 100) {
      // Escala Ciudad (100 m - 2 km)
      return { minZ: 1.0, maxZ: 25000.0 };
    } else {
      // Escala Suelo (< 100 m)
      return { minZ: 0.1, maxZ: 5000.0 };
    }
  }

  public applyToCamera(camera: Camera, altitudeMeters: number): void {
    const clipping = this.computeAdaptiveClipping(altitudeMeters);
    camera.minZ = clipping.minZ;
    camera.maxZ = clipping.maxZ;
  }
}
