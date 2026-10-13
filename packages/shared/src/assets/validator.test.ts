import { describe, it, expect } from 'vitest';
import { AssetPipelineValidator, type AssetMetadata } from './validator.js';

describe('AssetPipelineValidator (T07 Pipeline de Activos y Licencias)', () => {
  const validAsset: AssetMetadata = {
    filename: 'e2_almacen_piedra_lod0.glb',
    author: 'Equipo 3D Universo RTS',
    license: 'MIT',
    triangles: 1200,
    dimensionsMeters: {
      width: 8,
      height: 4,
      depth: 6
    },
    pivotAtBase: true
  };

  it('valida con éxito un activo que cumple todos los criterios técnicos', () => {
    const res = AssetPipelineValidator.validate(validAsset);
    expect(res.valid).toBe(true);
    expect(res.era).toBe(2);
    expect(res.category).toBe('almacen');
    expect(res.variant).toBe('piedra');
    expect(res.lod).toBe(0);
    expect(res.errors.length).toBe(0);
  });

  it('rechaza nombres que no sigan la convención estricta era_categoria_variante_lod', () => {
    const invalidName = { ...validAsset, filename: 'model_house_final_v2.glb' };
    const res = AssetPipelineValidator.validate(invalidName);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toMatch(/Nomenclatura inválida/);
  });

  it('rechaza activos que excedan el presupuesto de polígonos del LOD asignado', () => {
    // LOD2 permite máximo 200 triángulos
    const heavyLod2 = {
      ...validAsset,
      filename: 'e2_almacen_piedra_lod2.glb',
      triangles: 450
    };
    const res = AssetPipelineValidator.validate(heavyLod2);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toMatch(/Exceso de polígonos para LOD2/);
  });

  it('rechaza activos con licencias no comerciales o no permitidas', () => {
    const unapprovedLicense = { ...validAsset, license: 'OTHER' as const };
    const res = AssetPipelineValidator.validate(unapprovedLicense);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toMatch(/Licencia 'OTHER' no autorizada/);
  });

  it('rechaza activos cuyo pivote no esté situado en la base', () => {
    const uncenteredPivot = { ...validAsset, pivotAtBase: false };
    const res = AssetPipelineValidator.validate(uncenteredPivot);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toMatch(/El pivote del modelo debe estar situado en la base/);
  });
});
