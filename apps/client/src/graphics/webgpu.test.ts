import { describe, it, expect } from 'vitest';
import { initializeWebGPUEngine, WebGPUNotSupportedError } from './webgpu.js';

describe('WebGPU Exclusive Engine Factory (T09)', () => {
  it('lanza WebGPUNotSupportedError si navigator.gpu no está disponible (prueba negativa)', async () => {
    // En entorno Node.js / Vitest sin bandera WebGPU nativa, navigator.gpu no existe
    const mockCanvas = {} as HTMLCanvasElement;
    await expect(initializeWebGPUEngine(mockCanvas)).rejects.toThrowError(
      WebGPUNotSupportedError
    );
  });

  it('WebGPUNotSupportedError contiene nombre y mensaje descriptivo', () => {
    const err = new WebGPUNotSupportedError('Prueba de error WebGPU');
    expect(err.name).toBe('WebGPUNotSupportedError');
    expect(err.message).toBe('Prueba de error WebGPU');
  });
});
