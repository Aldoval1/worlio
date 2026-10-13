import { describe, it, expect } from 'vitest';
import { BuildingInstanceGenerator } from './index.js';

describe('BuildingInstanceGenerator & Thin Instances (T10)', () => {
  it('genera un buffer de tamaño exacto para 1.000 instancias (64 KB)', () => {
    const buffer = BuildingInstanceGenerator.generateMatrixBuffer({
      count: 1000,
      seed: 'TEST-1000',
      spacing: 4.0
    });

    // 1.000 instancias * 16 floats = 16.000 floats * 4 bytes/float = 64.000 bytes
    expect(buffer.length).toBe(16000);
    expect(buffer.byteLength).toBe(64000);
  });

  it('genera un buffer de tamaño exacto para 10.000 instancias (640 KB)', () => {
    const buffer = BuildingInstanceGenerator.generateMatrixBuffer({
      count: 10000,
      seed: 'TEST-10000',
      spacing: 4.0
    });

    // 10.000 instancias * 16 floats = 160.000 floats * 4 bytes/float = 640.000 bytes
    expect(buffer.length).toBe(160000);
    expect(buffer.byteLength).toBe(640000);
  });

  it('produce matrices válidas con coordenadas finitas y sin NaN', () => {
    const buffer = BuildingInstanceGenerator.generateMatrixBuffer({
      count: 100,
      seed: 'TEST-FINITE',
      spacing: 5.0
    });

    for (let i = 0; i < buffer.length; i++) {
      expect(Number.isFinite(buffer[i])).toBe(true);
      expect(Number.isNaN(buffer[i])).toBe(false);
    }
  });

  it('distribuye las instancias en una cuadrícula simétrica centrada', () => {
    const buffer = BuildingInstanceGenerator.generateMatrixBuffer({
      count: 4, // 2x2 grid
      seed: 'TEST-GRID',
      spacing: 10.0
    });

    // Primera instancia (0,0) -> offset = (2-1)*10*0.5 = 5.0 -> x = -5.0, z = -5.0
    // En matriz de Babylon, traslación X en índice 12, Y en 13, Z en 14
    expect(buffer[12]).toBe(-5);
    expect(buffer[13]).toBe(1);
    expect(buffer[14]).toBe(-5);

    // Segunda instancia (1,0) -> x = 10 - 5 = 5.0, z = -5.0
    expect(buffer[16 + 12]).toBe(5);
    expect(buffer[16 + 13]).toBe(1);
    expect(buffer[16 + 14]).toBe(-5);
  });
});
