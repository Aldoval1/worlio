import { Vector3, type Camera, type Scene } from '@babylonjs/core';
import type { Vector3D } from '@universo/shared';
import type { TerrainSampler } from '@universo/worldgen';
import {
  applyCursorAnchoredZoom,
  intersectRayWithPlanetSphere,
  refineIntersectionWithTerrain
} from './anchorPicking.js';
import {
  calculateFreeAltitude,
  calculateZoomDelta,
  clampAltitude,
  smoothDamp,
  type DampVelocity
} from './zoomMath.js';

export interface OrbitalControllerOptions {
  minAltitudeMeters?: number;
  maxAltitudeMeters?: number;
  zoomSensitivity?: number;
  smoothTimeSeconds?: number;
}

export class OrbitalCameraController {
  public readonly scene: Scene;
  public readonly camera: Camera;
  public readonly planetRadiusMeters: number;
  public readonly sampler: TerrainSampler;

  public currentAltitude: number;
  public targetAltitude: number;
  public activeAnchor: Vector3D | null = null;
  public isDragging = false;

  private readonly minAltitude: number;
  private readonly maxAltitude: number;
  private readonly zoomSensitivity: number;
  private readonly smoothTime: number;
  private readonly velocity: DampVelocity = { value: 0 };

  constructor(
    scene: Scene,
    camera: Camera,
    planetRadiusMeters: number,
    sampler: TerrainSampler,
    options: OrbitalControllerOptions = {}
  ) {
    this.scene = scene;
    this.camera = camera;
    this.planetRadiusMeters = planetRadiusMeters;
    this.sampler = sampler;

    this.minAltitude = options.minAltitudeMeters ?? 2.0;
    this.maxAltitude = options.maxAltitudeMeters ?? 1_500_000.0;
    this.zoomSensitivity = options.zoomSensitivity ?? 0.0015;
    this.smoothTime = options.smoothTimeSeconds ?? 0.08;

    const initialPos = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    };
    this.currentAltitude = calculateFreeAltitude(initialPos, planetRadiusMeters);
    this.targetAltitude = this.currentAltitude;
  }

  /**
   * Manejador de evento de rueda / trackpad (Zoom continuo proporcional a altitud).
   */
  public handleWheel(
    deltaY: number,
    _screenNormalizedX = 0.5,
    _screenNormalizedY = 0.5
  ): void {
    const zoomStep = calculateZoomDelta(
      this.currentAltitude,
      deltaY,
      this.zoomSensitivity
    );

    // Si hay ancla bajo el cursor, aplicar zoom proyectado al ancla
    if (this.activeAnchor && !this.isDragging) {
      const currentPos: Vector3D = {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      };

      const result = applyCursorAnchoredZoom(
        currentPos,
        this.activeAnchor,
        zoomStep,
        this.planetRadiusMeters,
        this.minAltitude
      );

      this.targetAltitude = result.newAltitude;
      this.camera.position.set(result.newCameraPos.x, result.newCameraPos.y, result.newCameraPos.z);
    } else {
      // Zoom radial convencional respecto al centro del planeta
      this.targetAltitude = clampAltitude(
        this.targetAltitude - zoomStep,
        this.minAltitude,
        this.maxAltitude
      );
    }
  }

  /**
   * Actualiza el anclaje geográfico bajo el cursor en pantalla (Screen picking).
   */
  public updateCursorAnchor(rayOrigin: Vector3D, rayDirection: Vector3D): boolean {
    if (this.isDragging) return false;

    const hit = intersectRayWithPlanetSphere(rayOrigin, rayDirection, this.planetRadiusMeters);
    if (hit.hit) {
      const refined = refineIntersectionWithTerrain(
        rayOrigin,
        rayDirection,
        hit.point,
        this.sampler,
        this.planetRadiusMeters
      );
      this.activeAnchor = refined;
      return true;
    }

    this.activeAnchor = null;
    return false;
  }

  public onDragStart(): void {
    this.isDragging = true;
    this.activeAnchor = null; // Cancelar anclaje al arrastrar explícitamente
  }

  public onDragEnd(): void {
    this.isDragging = false;
  }

  /**
   * Actualización por frame (suavizado independiente de Hz y mantenimiento de Up Vector estable).
   */
  public update(deltaTimeSeconds: number): void {
    // 1. Suavizar altitud hacia el objetivo
    if (Math.abs(this.currentAltitude - this.targetAltitude) > 0.01) {
      this.currentAltitude = smoothDamp(
        this.currentAltitude,
        this.targetAltitude,
        this.velocity,
        this.smoothTime,
        deltaTimeSeconds
      );

      // Ajustar distancia radial de la cámara
      const currentDist = Math.hypot(
        this.camera.position.x,
        this.camera.position.y,
        this.camera.position.z
      );

      if (currentDist > 1.0) {
        const desiredDist = this.planetRadiusMeters + this.currentAltitude;
        const scale = desiredDist / currentDist;
        this.camera.position.x *= scale;
        this.camera.position.y *= scale;
        this.camera.position.z *= scale;
      }
    }

    // 2. Mantener orientación y Up Vector estable hacia el cenit local (prevenir roll y gimbal lock)
    this.enforceStableUpVector();
  }

  /**
   * Mantiene el vector UP de la cámara alineado con el polo Y global o cenit local,
   * eliminando giros indeseados sobre el eje longitudinal (roll).
   */
  private enforceStableUpVector(): void {
    const pos = this.camera.position;
    const radial = new Vector3(pos.x, pos.y, pos.z).normalize();

    // Vector Up de referencia por defecto: +Y
    let up = new Vector3(0, 1, 0);

    // Singularidad polar: si la cámara está directamente sobre los polos (+Y o -Y),
    // usar +Z como vector ortogonal secundario para evitar indeterminación
    if (Math.abs(radial.y) > 0.999) {
      up = new Vector3(0, 0, radial.y > 0 ? -1 : 1);
    }

    this.camera.upVector = up;
  }
}
