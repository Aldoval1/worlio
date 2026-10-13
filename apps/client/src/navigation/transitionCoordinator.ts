import {
  Color3,
  Quaternion,
  Scene,
  Vector3,
  type Camera
} from '@babylonjs/core';
import type { Vector3D } from '@universo/shared';
import {
  ATMOSPHERE_GROUND_ALTITUDE_METERS,
  ATMOSPHERE_TOP_ALTITUDE_METERS,
  evaluateAtmosphere,
  smoothstep,
  type AtmosphereParameters
} from './atmosphereFog.js';

export interface TransitionState {
  transitionFactor: number; // 0.0 = órbita completa, 1.0 = suelo regional
  nearClip: number;
  farClip: number;
  atmosphere: AtmosphereParameters;
  cameraOrientation: Quaternion;
}

export class TransitionCoordinator {
  public readonly scene: Scene;
  public readonly planetRadiusMeters: number;

  public transitionFactor = 0.0;
  public currentNearClip = 500.0;
  public currentFarClip = 1_000_000.0;

  constructor(scene: Scene, planetRadiusMeters: number) {
    this.scene = scene;
    this.planetRadiusMeters = planetRadiusMeters;

    // Configurar modo de niebla atmosférica en Babylon
    this.scene.fogMode = Scene.FOGMODE_LINEAR;
  }

  /**
   * Calcula los planos de corte near y far adaptativos para garantizar precisión
   * en el búfer de profundidad (Float32 depth buffer) y eliminar z-fighting a cualquier escala.
   */
  public calculateClippingPlanes(altitudeMeters: number): { near: number; far: number } {
    const h = Math.max(1.0, altitudeMeters);

    // Distancia geométrica al horizonte visible: d = sqrt(h^2 + 2*R*h)
    const horizonDistance = Math.sqrt(h * h + 2.0 * this.planetRadiusMeters * h);

    // Plano cercano: muy cercano en suelo (0.1 m), mayor en el espacio (500 m)
    const near = Math.max(0.1, Math.min(500.0, h * 0.04));

    // Plano lejano: cubre el horizonte más un margen conservador del 60%
    const far = Math.max(8_000.0, horizonDistance * 1.6);

    return { near, far };
  }

  /**
   * Interpola suavemente la orientación de la cámara usando Slerp de cuaterniones
   * entre la orientación orbital (mirando al planeta global) y la orientación de suelo
   * (tangente al plano local ENU, pitch hacia el horizonte, roll = 0).
   */
  public computeInterpolatedOrientation(
    cameraPos: Vector3D,
    lookTarget: Vector3D,
    transitionFactor: number
  ): Quaternion {
    // Vector dirección hacia el objetivo
    const forward = new Vector3(
      lookTarget.x - cameraPos.x,
      lookTarget.y - cameraPos.y,
      lookTarget.z - cameraPos.z
    ).normalize();

    // Normal radial (cenit local)
    const radialUp = new Vector3(cameraPos.x, cameraPos.y, cameraPos.z).normalize();

    // Cuaternión en modo orbital (Up alineado al cenit local o polo global)
    const orbitUp = Math.abs(radialUp.y) > 0.99 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
    const orbitRot = Quaternion.FromLookDirectionRH(forward, orbitUp).normalize();

    // Cuaternión en modo regional/suelo (Up estrictamente cenit local)
    const groundRot = Quaternion.FromLookDirectionRH(forward, radialUp).normalize();

    // Slerp continuo sin saltos angulares
    const result = Quaternion.Identity();
    Quaternion.SlerpToRef(orbitRot, groundRot, transitionFactor, result);
    result.normalize();

    return result;
  }

  /**
   * Actualiza la transición continua de cámara, niebla atmosférica y planos de corte.
   */
  public update(camera: Camera, altitudeMeters: number, lookTarget?: Vector3D): TransitionState {
    // 1. Factor de transición basado en altitud libre [0.0 = espacio, 1.0 = superficie]
    const rawFactor =
      (ATMOSPHERE_TOP_ALTITUDE_METERS - altitudeMeters) /
      (ATMOSPHERE_TOP_ALTITUDE_METERS - ATMOSPHERE_GROUND_ALTITUDE_METERS);
    this.transitionFactor = smoothstep(0.0, 1.0, rawFactor);

    // 2. Planos de corte dinámicos
    const { near, far } = this.calculateClippingPlanes(altitudeMeters);
    this.currentNearClip = near;
    this.currentFarClip = far;
    camera.minZ = near;
    camera.maxZ = far;

    // 3. Parámetros atmosféricos y niebla
    const atmosphere = evaluateAtmosphere(altitudeMeters, this.planetRadiusMeters);
    this.scene.clearColor = atmosphere.skyColor;
    this.scene.fogStart = atmosphere.fogStartMeters;
    this.scene.fogEnd = atmosphere.fogEndMeters;
    this.scene.fogColor = new Color3(
      atmosphere.skyColor.r,
      atmosphere.skyColor.g,
      atmosphere.skyColor.b
    );

    // 4. Orientación con cuaterniones
    const target = lookTarget ?? { x: 0, y: 0, z: 0 };
    const camPos: Vector3D = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    };
    const cameraOrientation = this.computeInterpolatedOrientation(
      camPos,
      target,
      this.transitionFactor
    );

    return {
      transitionFactor: this.transitionFactor,
      nearClip: near,
      farClip: far,
      atmosphere,
      cameraOrientation
    };
  }
}
