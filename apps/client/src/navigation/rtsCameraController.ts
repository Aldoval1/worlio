import { Vector3, type Camera, type Scene } from '@babylonjs/core';
import type { Vector3D } from '@universo/shared';
import type { TerrainSampler } from '@universo/worldgen';
import {
  MIN_GROUND_CLEARANCE_METERS,
  queryGroundUnderPosition,
  resolveGroundCollision,
  slideAlongSlope
} from './groundCollision.js';
import { clampAltitude, smoothDamp, type DampVelocity } from './zoomMath.js';

export interface RtsCameraControllerOptions {
  minClearanceMeters?: number; // Descenso estricto hasta 2 m
  maxClearanceMeters?: number; // Techo regional antes de órbita (25 km)
  defaultDistanceMeters?: number; // Distancia inicial al objetivo
  minPitchDegrees?: number; // Ángulo mínimo de picado (25°)
  maxPitchDegrees?: number; // Ángulo cenital máximo (88°)
  basePanSpeedMetersPerSec?: number;
  smoothTimeSeconds?: number;
}

export class RtsCameraController {
  public readonly scene: Scene;
  public readonly camera: Camera;
  public readonly planetRadiusMeters: number;
  public readonly sampler: TerrainSampler;

  // Parámetros de vista
  public targetGroundPoint: Vector3D;
  public distanceMeters: number;
  public targetDistanceMeters: number;
  public yawRadians: number = 0; // Giro horizontal (acimut)
  public pitchRadians: number = Math.PI / 4; // 45° por defecto

  public readonly minClearance: number;
  public readonly maxClearance: number;
  public readonly minPitch: number;
  public readonly maxPitch: number;
  public readonly basePanSpeed: number;
  public readonly smoothTime: number;

  private readonly distanceVelocity: DampVelocity = { value: 0 };
  private lastCameraPosition: Vector3D;

  constructor(
    scene: Scene,
    camera: Camera,
    planetRadiusMeters: number,
    sampler: TerrainSampler,
    initialTarget: Vector3D,
    options: RtsCameraControllerOptions = {}
  ) {
    this.scene = scene;
    this.camera = camera;
    this.planetRadiusMeters = planetRadiusMeters;
    this.sampler = sampler;

    this.minClearance = options.minClearanceMeters ?? MIN_GROUND_CLEARANCE_METERS;
    this.maxClearance = options.maxClearanceMeters ?? 25_000.0;
    this.minPitch = ((options.minPitchDegrees ?? 25.0) * Math.PI) / 180.0;
    this.maxPitch = ((options.maxPitchDegrees ?? 88.0) * Math.PI) / 180.0;
    this.basePanSpeed = options.basePanSpeedMetersPerSec ?? 80.0;
    this.smoothTime = options.smoothTimeSeconds ?? 0.08;

    this.distanceMeters = options.defaultDistanceMeters ?? 50.0;
    this.targetDistanceMeters = this.distanceMeters;

    // Asegurar que el punto objetivo inicial esté anclado exactamente al relieve
    const r = Math.hypot(initialTarget.x, initialTarget.y, initialTarget.z);
    const safeR = Math.max(1.0, r);
    const ux = initialTarget.x / safeR;
    const uy = initialTarget.y / safeR;
    const uz = initialTarget.z / safeR;
    const h = sampler.sample(ux, uy, uz).heightMeters;
    const groundR = planetRadiusMeters + h;

    this.targetGroundPoint = {
      x: ux * groundR,
      y: uy * groundR,
      z: uz * groundR
    };

    this.lastCameraPosition = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    };

    this.recomputeCameraTransform(0);
  }

  /**
   * Paneo tangencial en el plano local del terreno (WASD / cursor edge).
   * Desplaza el punto objetivo siguiendo el contorno del relieve sin atravesar montañas.
   */
  public pan(forwardDelta: number, rightDelta: number, deltaTimeSeconds: number): void {
    if (forwardDelta === 0 && rightDelta === 0) return;

    const { forward, right } = this.computeLocalBasis();

    // La velocidad de desplazamiento escala con la distancia/altitud al suelo
    const speed = this.basePanSpeed * Math.max(1.0, this.distanceMeters / 30.0);
    const moveX = (forward.x * forwardDelta + right.x * rightDelta) * speed * deltaTimeSeconds;
    const moveY = (forward.y * forwardDelta + right.y * rightDelta) * speed * deltaTimeSeconds;
    const moveZ = (forward.z * forwardDelta + right.z * rightDelta) * speed * deltaTimeSeconds;

    const currentGroundInfo = queryGroundUnderPosition(this.targetGroundPoint, this.sampler, this.planetRadiusMeters);

    // Deflexión de velocidad en pendientes (Slide along slope)
    const slidedMove = slideAlongSlope(
      { x: moveX, y: moveY, z: moveZ },
      currentGroundInfo.normal
    );

    const newTargetX = this.targetGroundPoint.x + slidedMove.x;
    const newTargetY = this.targetGroundPoint.y + slidedMove.y;
    const newTargetZ = this.targetGroundPoint.z + slidedMove.z;

    // Reanclar al relieve real (seguimiento de contorno continuo / ground-following)
    const newR = Math.hypot(newTargetX, newTargetY, newTargetZ);
    const newUx = newTargetX / newR;
    const newUy = newTargetY / newR;
    const newUz = newTargetZ / newR;

    const newH = this.sampler.sample(newUx, newUy, newUz).heightMeters;
    const finalR = this.planetRadiusMeters + newH;

    this.targetGroundPoint = {
      x: newUx * finalR,
      y: newUy * finalR,
      z: newUz * finalR
    };
  }

  /**
   * Rotación de órbita local (Yaw horizontal y Pitch vertical clamp entre 25° y 88°).
   */
  public rotate(yawDeltaRad: number, pitchDeltaRad: number): void {
    this.yawRadians += yawDeltaRad;
    // Normalizar yaw a [-PI, PI]
    this.yawRadians = (this.yawRadians + Math.PI) % (2 * Math.PI) - Math.PI;

    this.pitchRadians = Math.max(
      this.minPitch,
      Math.min(this.maxPitch, this.pitchRadians + pitchDeltaRad)
    );
  }

  /**
   * Zoom de distancia hacia el punto objetivo en el suelo (clamp a >= minClearance).
   */
  public zoom(deltaMeters: number): void {
    this.targetDistanceMeters = clampAltitude(
      this.targetDistanceMeters + deltaMeters,
      this.minClearance,
      this.maxClearance
    );
  }

  /**
   * Actualización por frame: suavizado de distancia, colisión con suelo y cálculo de posición de cámara.
   */
  public update(deltaTimeSeconds: number): void {
    // 1. Suavizar distancia
    if (Math.abs(this.distanceMeters - this.targetDistanceMeters) > 0.01) {
      this.distanceMeters = smoothDamp(
        this.distanceMeters,
        this.targetDistanceMeters,
        this.distanceVelocity,
        this.smoothTime,
        deltaTimeSeconds
      );
    }

    // 2. Recomputar posición de cámara y resolver colisiones con el relieve
    this.recomputeCameraTransform(deltaTimeSeconds);
  }

  /**
   * Calcula la posición de la cámara en base al punto objetivo, ángulos y distancia,
   * aplicando colisión estricta de suelo (resolveGroundCollision) y prevención de penetración.
   */
  private recomputeCameraTransform(deltaTimeSeconds: number): void {
    const { forward, up } = this.computeLocalBasis();

    // Offset de cámara en el marco esférico local:
    // P_cam = Target - distance * cos(pitch) * Forward + distance * sin(pitch) * Up
    const cosPitch = Math.cos(this.pitchRadians);
    const sinPitch = Math.sin(this.pitchRadians);

    const rawCamX = this.targetGroundPoint.x - this.distanceMeters * cosPitch * forward.x + this.distanceMeters * sinPitch * up.x;
    const rawCamY = this.targetGroundPoint.y - this.distanceMeters * cosPitch * forward.y + this.distanceMeters * sinPitch * up.y;
    const rawCamZ = this.targetGroundPoint.z - this.distanceMeters * cosPitch * forward.z + this.distanceMeters * sinPitch * up.z;

    const rawCamPos: Vector3D = { x: rawCamX, y: rawCamY, z: rawCamZ };

    // 3. Resolución física de colisión contra relieve visible
    const resolvedCamPos = resolveGroundCollision(
      rawCamPos,
      this.sampler,
      this.planetRadiusMeters,
      this.minClearance
    );

    // 4. Si la colisión levantó la cámara respecto a su trayectoria deseada (ej. pico de montaña intermedio),
    // verificar deflexión con slope normal
    if (deltaTimeSeconds > 0) {
      const vel: Vector3D = {
        x: (resolvedCamPos.x - this.lastCameraPosition.x) / deltaTimeSeconds,
        y: (resolvedCamPos.y - this.lastCameraPosition.y) / deltaTimeSeconds,
        z: (resolvedCamPos.z - this.lastCameraPosition.z) / deltaTimeSeconds
      };
      const query = queryGroundUnderPosition(resolvedCamPos, this.sampler, this.planetRadiusMeters);
      const deflVel = slideAlongSlope(vel, query.normal);
      const finalX = this.lastCameraPosition.x + deflVel.x * deltaTimeSeconds;
      const finalY = this.lastCameraPosition.y + deflVel.y * deltaTimeSeconds;
      const finalZ = this.lastCameraPosition.z + deflVel.z * deltaTimeSeconds;
      this.camera.position.set(finalX, finalY, finalZ);
    } else {
      this.camera.position.set(resolvedCamPos.x, resolvedCamPos.y, resolvedCamPos.z);
    }

    this.lastCameraPosition = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    };

    // 5. Orientar la cámara hacia el objetivo y asegurar UP estable alineado al cenit local
    this.camera.upVector = new Vector3(up.x, up.y, up.z);

    // Si la cámara tiene método setTarget (como FreeCamera / TargetCamera / ArcRotateCamera)
    const targetCam = this.camera as unknown as { setTarget?: (target: Vector3) => void };
    if (typeof targetCam.setTarget === 'function') {
      targetCam.setTarget(new Vector3(
        this.targetGroundPoint.x,
        this.targetGroundPoint.y,
        this.targetGroundPoint.z
      ));
    }
  }

  /**
   * Calcula la base ortonormal local (Up = Cenit radial, East, North, Forward, Right).
   */
  public computeLocalBasis(): {
    up: Vector3D;
    forward: Vector3D;
    right: Vector3D;
    east: Vector3D;
    north: Vector3D;
  } {
    const r = Math.hypot(this.targetGroundPoint.x, this.targetGroundPoint.y, this.targetGroundPoint.z);
    const safeR = Math.max(1.0, r);
    const up: Vector3D = {
      x: this.targetGroundPoint.x / safeR,
      y: this.targetGroundPoint.y / safeR,
      z: this.targetGroundPoint.z / safeR
    };

    // Vector de referencia polar global +Y
    let refX = 0;
    let refY = 1;
    let refZ = 0;

    // Singularidad polar: si Up es paralelo a Y, usar Z
    if (Math.abs(up.y) > 0.999) {
      refX = 0;
      refY = 0;
      refZ = up.y > 0 ? -1 : 1;
    }

    // East = Ref x Up
    let ex = refY * up.z - refZ * up.y;
    let ey = refZ * up.x - refX * up.z;
    let ez = refX * up.y - refY * up.x;
    const eLen = Math.max(1e-6, Math.hypot(ex, ey, ez));
    ex /= eLen;
    ey /= eLen;
    ez /= eLen;
    const east: Vector3D = { x: ex, y: ey, z: ez };

    // North = Up x East
    const nx = up.y * ez - up.z * ey;
    const ny = up.z * ex - up.x * ez;
    const nz = up.x * ey - up.y * ex;
    const north: Vector3D = { x: nx, y: ny, z: nz };

    // Forward y Right basados en acimut/yaw relativo al Norte
    const cosYaw = Math.cos(this.yawRadians);
    const sinYaw = Math.sin(this.yawRadians);

    const forward: Vector3D = {
      x: north.x * cosYaw + east.x * sinYaw,
      y: north.y * cosYaw + east.y * sinYaw,
      z: north.z * cosYaw + east.z * sinYaw
    };

    const right: Vector3D = {
      x: -north.x * sinYaw + east.x * cosYaw,
      y: -north.y * sinYaw + east.y * cosYaw,
      z: -north.z * sinYaw + east.z * cosYaw
    };

    return { up, forward, right, east, north };
  }
}
