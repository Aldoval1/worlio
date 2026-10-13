import type { Vector3D } from '@universo/shared';

export interface TerrainElevationQuery {
  sample(ux: number, uy: number, uz: number): { heightMeters: number };
}

export interface SplineEvaluationResult {
  samples: Vector3D[];
  lengthMeters: number;
  maxGradePercent: number;
}

export const ROAD_GROUND_OFFSET_METERS = 0.12; // Desplazamiento vertical para evitar z-fighting con el suelo

/**
 * Evalúa y proyecta una spline cúbica Catmull-Rom sobre el relieve planetario procedural.
 * Garantiza suavidad $C^1$ y calcula la pendiente física real del trazado.
 */
export function projectSplineOnTerrain(
  controlPoints: Vector3D[],
  sampler: TerrainElevationQuery,
  planetRadiusMeters: number,
  segmentsCount = 32
): SplineEvaluationResult {
  if (controlPoints.length < 2) {
    throw new Error('Se requieren al menos 2 puntos de control para trazar una carretera.');
  }

  // Si solo hay 2 puntos, generar puntos de control virtuales para Catmull-Rom
  const pts: Vector3D[] = [];
  if (controlPoints.length === 2) {
    const p0 = controlPoints[0]!;
    const p1 = controlPoints[1]!;
    // Extrapolación lineal para los puntos fantasma p-1 y p+2
    const pPrev: Vector3D = {
      x: p0.x - (p1.x - p0.x) * 0.5,
      y: p0.y - (p1.y - p0.y) * 0.5,
      z: p0.z - (p1.z - p0.z) * 0.5
    };
    const pNext: Vector3D = {
      x: p1.x + (p1.x - p0.x) * 0.5,
      y: p1.y + (p1.y - p0.y) * 0.5,
      z: p1.z + (p1.z - p0.z) * 0.5
    };
    pts.push(pPrev, p0, p1, pNext);
  } else {
    // Duplicar extremos si hay 3 o más
    pts.push(controlPoints[0]!, ...controlPoints, controlPoints[controlPoints.length - 1]!);
  }

  const numSections = pts.length - 3;
  const samplesPerSection = Math.max(2, Math.floor(segmentsCount / numSections));
  const samples: Vector3D[] = [];

  let totalLength = 0;
  let maxGrade = 0;
  let previousGroundPt: Vector3D | null = null;
  let previousHeight = 0;

  for (let s = 0; s < numSections; s++) {
    const p0 = pts[s]!;
    const p1 = pts[s + 1]!;
    const p2 = pts[s + 2]!;
    const p3 = pts[s + 3]!;

    const isLastSection = s === numSections - 1;
    const steps = isLastSection ? samplesPerSection + 1 : samplesPerSection;

    for (let i = 0; i < steps; i++) {
      const t = i / samplesPerSection;

      // Catmull-Rom estándar
      const rawX = catmullRom(p0.x, p1.x, p2.x, p3.x, t);
      const rawY = catmullRom(p0.y, p1.y, p2.y, p3.y, t);
      const rawZ = catmullRom(p0.z, p1.z, p2.z, p3.z, t);

      // Proyectar radialmente sobre la esfera y muestrear elevación real del relieve
      const rRaw = Math.hypot(rawX, rawY, rawZ);
      const safeR = Math.max(1.0, rRaw);
      const ux = rawX / safeR;
      const uy = rawY / safeR;
      const uz = rawZ / safeR;

      const terrainSample = sampler.sample(ux, uy, uz);
      const currentHeight = terrainSample.heightMeters;
      const targetRadius = planetRadiusMeters + currentHeight + ROAD_GROUND_OFFSET_METERS;

      const groundPt: Vector3D = {
        x: ux * targetRadius,
        y: uy * targetRadius,
        z: uz * targetRadius
      };

      samples.push(groundPt);

      // Calcular distancia y pendiente
      if (previousGroundPt) {
        const segDist = Math.hypot(
          groundPt.x - previousGroundPt.x,
          groundPt.y - previousGroundPt.y,
          groundPt.z - previousGroundPt.z
        );
        totalLength += segDist;

        if (segDist > 0.01) {
          const deltaH = Math.abs(currentHeight - previousHeight);
          // Pendiente % = (desnivel vertical / distancia horizontal) * 100
          const grade = (deltaH / segDist) * 100;
          if (grade > maxGrade) {
            maxGrade = grade;
          }
        }
      }

      previousGroundPt = groundPt;
      previousHeight = currentHeight;
    }
  }

  return {
    samples,
    lengthMeters: totalLength,
    maxGradePercent: Number(maxGrade.toFixed(2))
  };
}

/**
 * Interpolación escalar Catmull-Rom cúbica.
 */
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;

  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}
