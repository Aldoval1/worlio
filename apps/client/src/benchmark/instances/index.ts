import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Matrix,
  Vector3,
  type Scene,
  type Mesh
} from '@babylonjs/core';

export interface InstanceBenchmarkConfig {
  count: number;
  seed: string;
  spacing: number;
}

export interface InstanceBenchmarkMetrics {
  count: number;
  generationTimeMs: number;
  bufferByteLength: number;
  estimatedDrawCalls: number;
  strategy: 'THIN_INSTANCES' | 'INDEPENDENT_MESHES';
}

export class BuildingInstanceGenerator {
  /**
   * Genera un buffer de matrices 4x4 (Float32Array) ordenadas para Thin Instances
   */
  public static generateMatrixBuffer(config: InstanceBenchmarkConfig): Float32Array {
    const { count, spacing } = config;
    const matrixBuffer = new Float32Array(count * 16);

    // Distribución en cuadrícula cuadrada
    const side = Math.ceil(Math.sqrt(count));
    const offset = (side - 1) * spacing * 0.5;

    let index = 0;
    for (let z = 0; z < side && index < count; z++) {
      for (let x = 0; x < side && index < count; x++) {
        const posX = x * spacing - offset;
        const posY = 1.0; // Altura del centro del edificio
        const posZ = z * spacing - offset;

        // Generar matriz 4x4 en orden column-major / Babylon
        const mat = Matrix.Translation(posX, posY, posZ);
        matrixBuffer.set(mat.asArray(), index * 16);
        index++;
      }
    }

    return matrixBuffer;
  }

  /**
   * Configura una malla con Thin Instances masivas en Babylon.js
   */
  public static createThinInstanceMesh(
    scene: Scene,
    config: InstanceBenchmarkConfig
  ): { mesh: Mesh; metrics: InstanceBenchmarkMetrics } {
    const startTime = performance.now();

    // 1. Malla base compartida (un cubo simple que representa un edificio prototípico)
    const baseMesh = MeshBuilder.CreateBox(
      'building_base_thin',
      { width: 2, height: 2, depth: 2 },
      scene
    );

    const mat = new StandardMaterial('thinInstanceMat', scene);
    mat.diffuseColor = new Color3(0.35, 0.45, 0.6);
    baseMesh.material = mat;

    // 2. Generar buffer de matrices
    const matrixBuffer = this.generateMatrixBuffer(config);

    // 3. Asignar Thin Instance Buffer en GPU
    // Stride = 16 floats (matriz 4x4), static = true
    baseMesh.thinInstanceSetBuffer('matrix', matrixBuffer, 16, true);

    const generationTimeMs = Number((performance.now() - startTime).toFixed(2));

    const metrics: InstanceBenchmarkMetrics = {
      count: config.count,
      generationTimeMs,
      bufferByteLength: matrixBuffer.byteLength,
      estimatedDrawCalls: 1, // 1 sola draw call para todos los edificios
      strategy: 'THIN_INSTANCES'
    };

    return {
      mesh: baseMesh,
      metrics
    };
  }

  /**
   * Actualización parcial de una instancia específica (para selección o cambio de estado)
   */
  public static updateInstanceTransform(
    mesh: Mesh,
    instanceIndex: number,
    position: Vector3,
    scale: number
  ): void {
    const mat = Matrix.Scaling(scale, scale, scale).multiply(
      Matrix.Translation(position.x, position.y, position.z)
    );
    mesh.thinInstanceSetMatrixAt(instanceIndex, mat, true);
  }
}
