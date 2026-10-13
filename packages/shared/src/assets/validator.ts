/**
 * Validador de activos 3D (Pipeline de Importación GLB y Auditoría)
 */

export interface AssetMetadata {
  filename: string;
  author: string;
  license: 'CC0' | 'MIT' | 'APACHE_2' | 'PROPRIETARY' | 'OTHER';
  triangles: number;
  dimensionsMeters: {
    width: number;
    height: number;
    depth: number;
  };
  pivotAtBase: boolean;
}

export interface AssetValidationResult {
  valid: boolean;
  era: number;
  category: string;
  variant: string;
  lod: number;
  errors: string[];
}

export class AssetPipelineValidator {
  // Patrón estricto: e{era}_{categoria}_{variante}_lod{lod}.glb
  private static readonly FILENAME_REGEX = /^e([1-5])_([a-z0-9]+)_([a-z0-9]+)_lod([0-3])\.glb$/;

  private static readonly MAX_TRIANGLES_BY_LOD: Record<number, number> = {
    0: 2500,
    1: 800,
    2: 200,
    3: 60
  };

  public static validate(asset: AssetMetadata): AssetValidationResult {
    const errors: string[] = [];

    // 1. Validar convención de nombres
    const match = this.FILENAME_REGEX.exec(asset.filename);
    if (!match) {
      errors.push(
        `Nomenclatura inválida para '${asset.filename}'. Debe coincidir con e{1-5}_{categoria}_{variante}_lod{0-3}.glb`
      );
      return {
        valid: false,
        era: 0,
        category: '',
        variant: '',
        lod: 0,
        errors
      };
    }

    const era = Number(match[1]);
    const category = match[2]!;
    const variant = match[3]!;
    const lod = Number(match[4]);

    // 2. Validar licencia permitida
    if (asset.license === 'OTHER') {
      errors.push(`Licencia 'OTHER' no autorizada. Se requiere CC0, MIT, APACHE_2 o PROPRIETARY.`);
    }

    // 3. Validar presupuesto de polígonos por LOD
    const maxTriangles = this.MAX_TRIANGLES_BY_LOD[lod] ?? 2500;
    if (asset.triangles > maxTriangles) {
      errors.push(
        `Exceso de polígonos para LOD${lod}: ${asset.triangles} triángulos (máximo permitido: ${maxTriangles}).`
      );
    }

    // 4. Validar dimensiones físicas
    if (
      asset.dimensionsMeters.width <= 0 ||
      asset.dimensionsMeters.height <= 0 ||
      asset.dimensionsMeters.depth <= 0
    ) {
      errors.push(`Las dimensiones físicas del activo deben ser números estrictamente positivos.`);
    }

    // 5. Validar pivote en base
    if (!asset.pivotAtBase) {
      errors.push(`El pivote del modelo debe estar situado en la base del cimiento (Y = 0).`);
    }

    return {
      valid: errors.length === 0,
      era,
      category,
      variant,
      lod,
      errors
    };
  }
}
