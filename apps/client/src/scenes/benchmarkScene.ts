import {
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  type WebGPUEngine
} from '@babylonjs/core';

export interface BenchmarkSceneResult {
  scene: Scene;
  camera: ArcRotateCamera;
  groundMesh: ReturnType<typeof MeshBuilder.CreateGround>;
  boxCount: number;
  firstRenderDurationMs: number;
}

export function createBenchmarkScene(
  engine: WebGPUEngine,
  canvas: HTMLCanvasElement
): BenchmarkSceneResult {
  const startTime = performance.now();

  // 1. Escena configurada en convención obligatoria: mano derecha, Y-arriba, metros
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  scene.clearColor = new Color3(0.027, 0.082, 0.149).toColor4(1.0); // #071526

  // 2. Cámara orbital centrada con límites ergonómicos
  const camera = new ArcRotateCamera(
    'benchmarkCamera',
    Math.PI / 4,
    Math.PI / 3,
    45,
    new Vector3(0, 0, 0),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = 200;
  camera.wheelPrecision = 20;

  // 3. Iluminación ambiental y solar direccional
  const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
  hemiLight.intensity = 0.6;
  hemiLight.diffuse = new Color3(0.9, 0.95, 1.0);

  const dirLight = new DirectionalLight('dirLight', new Vector3(-0.5, -1, -0.5), scene);
  dirLight.intensity = 0.8;
  dirLight.diffuse = new Color3(1.0, 0.95, 0.8);

  // 4. Suelo de referencia (40x40 metros)
  const ground = MeshBuilder.CreateGround(
    'ground',
    { width: 40, height: 40, subdivisions: 20 },
    scene
  );
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.196, 0.321, 0.204); // #325234
  groundMat.specularColor = new Color3(0.05, 0.05, 0.05);
  ground.material = groundMat;

  // 5. Instanciar 100 bloques de prueba (cuadrícula 10x10)
  const boxMat = new StandardMaterial('boxMat', scene);
  boxMat.diffuseColor = new Color3(0.7, 0.72, 0.75); // Bloques grises
  boxMat.specularColor = new Color3(0.1, 0.1, 0.1);

  const boxCount = 100;
  const gridSize = 10;
  const spacing = 3.0;
  const offset = (gridSize - 1) * spacing * 0.5;

  for (let z = 0; z < gridSize; z++) {
    for (let x = 0; x < gridSize; x++) {
      const box = MeshBuilder.CreateBox(
        `block_${x}_${z}`,
        { size: 1.5 },
        scene
      );
      box.position = new Vector3(x * spacing - offset, 0.75, z * spacing - offset);
      box.material = boxMat;
    }
  }

  // Primer pase de renderizado para compilar pipelines de WebGPU y shaders
  scene.render();
  const firstRenderDurationMs = Number((performance.now() - startTime).toFixed(2));

  return {
    scene,
    camera,
    groundMesh: ground,
    boxCount,
    firstRenderDurationMs
  };
}
