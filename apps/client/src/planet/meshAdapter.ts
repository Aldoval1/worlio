import {
  Mesh,
  VertexData,
  StandardMaterial,
  Color3,
  type Scene
} from '@babylonjs/core';
import {
  CUBE_FACES,
  generateCubeSphereFaceGeometry,
  TerrainSampler
} from '@universo/worldgen';
import type { PlanetDefinition } from '@universo/shared';

export interface PlanetOrbitalMeshResult {
  rootMesh: Mesh;
  landMeshes: Mesh[];
  oceanMeshes: Mesh[];
  totalTriangles: number;
  generationDurationMs: number;
}

export class PlanetMeshAdapter {
  public static createOrbitalPlanet(
    scene: Scene,
    planet: PlanetDefinition,
    subdivision = 32,
    wireframe = false
  ): PlanetOrbitalMeshResult {
    const startTime = performance.now();
    const sampler = new TerrainSampler(planet);

    const rootMesh = new Mesh(`planet_${planet.planetId}`, scene);
    const landMeshes: Mesh[] = [];
    const oceanMeshes: Mesh[] = [];
    let totalTriangles = 0;

    // Material de tierra con colores por vértice (biomas)
    const landMaterial = new StandardMaterial(`landMat_${planet.planetId}`, scene);
    landMaterial.specularColor = new Color3(0.05, 0.05, 0.05);
    landMaterial.wireframe = wireframe;

    // Material de océano
    const oceanMaterial = new StandardMaterial(`oceanMat_${planet.planetId}`, scene);
    oceanMaterial.diffuseColor = new Color3(0.055, 0.141, 0.263); // #0E2443
    oceanMaterial.specularColor = new Color3(0.4, 0.5, 0.7);
    oceanMaterial.wireframe = wireframe;

    // Generar las 6 caras del cubo proyectado
    for (const face of CUBE_FACES) {
      const faceData = generateCubeSphereFaceGeometry(
        face,
        subdivision,
        sampler,
        planet.radiusMeters,
        planet.seaLevelMeters
      );

      // 1. Malla de relieve terrestre
      const landMesh = new Mesh(`land_${face}`, scene);
      landMesh.parent = rootMesh;
      landMesh.material = landMaterial;

      const landVertexData = new VertexData();
      landVertexData.positions = Array.from(faceData.positions);
      landVertexData.normals = Array.from(faceData.normals);
      landVertexData.colors = Array.from(faceData.colors);
      landVertexData.indices = Array.from(faceData.indices);
      landVertexData.applyToMesh(landMesh);

      landMeshes.push(landMesh);
      totalTriangles += faceData.triangleCount;

      // 2. Malla oceánica
      const oceanMesh = new Mesh(`ocean_${face}`, scene);
      oceanMesh.parent = rootMesh;
      oceanMesh.material = oceanMaterial;

      const oceanVertexData = new VertexData();
      oceanVertexData.positions = Array.from(faceData.oceanPositions);
      oceanVertexData.normals = Array.from(faceData.normals);
      oceanVertexData.indices = Array.from(faceData.oceanIndices);
      oceanVertexData.applyToMesh(oceanMesh);

      oceanMeshes.push(oceanMesh);
      totalTriangles += faceData.triangleCount;
    }

    const generationDurationMs = Number((performance.now() - startTime).toFixed(2));

    return {
      rootMesh,
      landMeshes,
      oceanMeshes,
      totalTriangles,
      generationDurationMs
    };
  }
}
