import { WebGPUEngine } from '@babylonjs/core';

export class WebGPUNotSupportedError extends Error {
  constructor(message = 'WebGPU no está soportado en este entorno o la aceleración gráfica está desactivada.') {
    super(message);
    this.name = 'WebGPUNotSupportedError';
  }
}

export interface WebGPUInitResult {
  engine: WebGPUEngine;
  initDurationMs: number;
  adapterInfo: {
    vendor?: string;
    architecture?: string;
    device?: string;
    description?: string;
  } | null;
}

export async function initializeWebGPUEngine(
  canvas: HTMLCanvasElement
): Promise<WebGPUInitResult> {
  const startTime = performance.now();

  // 1. Detección nativa estricta de WebGPU (Sin WebGL ni degradación)
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    throw new WebGPUNotSupportedError('La API navigator.gpu no está presente en el navegador.');
  }

  const isSupported = await WebGPUEngine.IsSupportedAsync;
  if (!isSupported) {
    throw new WebGPUNotSupportedError('Babylon.js WebGPUEngine reporta que WebGPU no es compatible.');
  }

  // 2. Obtener información del adaptador de hardware si está disponible
  let adapterInfo: WebGPUInitResult['adapterInfo'] = null;
  try {
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance'
    });
    if (adapter && adapter.info) {
      adapterInfo = {
        vendor: adapter.info.vendor,
        architecture: adapter.info.architecture,
        device: adapter.info.device,
        description: adapter.info.description
      };
    }
  } catch (adapterErr) {
    console.warn('No se pudo consultar información extendida del adaptador WebGPU:', adapterErr);
  }

  // 3. Creación e inicialización asíncrona del motor WebGPU
  const engine = new WebGPUEngine(canvas, {
    powerPreference: 'high-performance',
    antialias: true
  });

  await engine.initAsync();
  const initDurationMs = Number((performance.now() - startTime).toFixed(2));

  return {
    engine,
    initDurationMs,
    adapterInfo
  };
}
