import {
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  Color3,
  type WebGPUEngine
} from '@babylonjs/core';
import { CANONICAL_PLANETS } from '@universo/worldgen';
import { PlanetMeshAdapter, type PlanetOrbitalMeshResult } from '../planet/meshAdapter.js';

export interface OrbitalSceneContext {
  scene: Scene;
  camera: ArcRotateCamera;
  planetResult: PlanetOrbitalMeshResult;
}

export function createOrbitalScene(
  engine: WebGPUEngine,
  canvas: HTMLCanvasElement
): OrbitalSceneContext {
  const urlParams = new URLSearchParams(window.location.search);
  const planetKey = (urlParams.get('planet') || 'TERRA_PRIME').toUpperCase();
  const wireframe = urlParams.get('wireframe') === '1';
  const subdivision = Number(urlParams.get('subdiv')) || 24;

  const planetDef = CANONICAL_PLANETS[planetKey] ?? CANONICAL_PLANETS['TERRA_PRIME']!;

  // 1. Escena en mano derecha
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  scene.clearColor = new Color3(0.015, 0.02, 0.035).toColor4(1.0); // Espacio profundo

  // 2. Cámara orbital en altitud espacial
  // Para radio de 125 km (125.000 m), colocamos la cámara a 320.000 m
  const camera = new ArcRotateCamera(
    'orbitalCamera',
    Math.PI / 3,
    Math.PI / 2.8,
    planetDef.radiusMeters * 2.6,
    new Vector3(0, 0, 0),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = planetDef.radiusMeters * 1.05; // Límite para no colisionar en órbita
  camera.upperRadiusLimit = planetDef.radiusMeters * 8.0;
  camera.wheelPrecision = 0.05;
  camera.maxZ = planetDef.radiusMeters * 20.0;
  camera.minZ = 1000.0;

  // 3. Sol Direccional e iluminación planetaria
  const sunLight = new DirectionalLight('sunLight', new Vector3(-1, -0.4, -0.8), scene);
  sunLight.intensity = 1.2;
  sunLight.diffuse = new Color3(1.0, 0.98, 0.9);

  const ambientLight = new HemisphericLight('ambientSpace', new Vector3(0, 1, 0), scene);
  ambientLight.intensity = 0.15;
  ambientLight.diffuse = new Color3(0.1, 0.15, 0.25);

  // 4. Malla planetaria procedural
  const planetResult = PlanetMeshAdapter.createOrbitalPlanet(
    scene,
    planetDef,
    subdivision,
    wireframe
  );

  return {
    scene,
    camera,
    planetResult
  };
}
