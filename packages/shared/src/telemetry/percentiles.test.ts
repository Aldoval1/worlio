import { describe, it, expect } from 'vitest';
import { MetricSampleWindow } from './index.js';

describe('MetricSampleWindow & Percentiles Calculation (T06)', () => {
  it('retorna null si no hay muestras registradas', () => {
    const window = new MetricSampleWindow(100);
    expect(window.computeStats()).toBeNull();
  });

  it('calcula percentiles correctamente en una distribución conocida', () => {
    const window = new MetricSampleWindow(100);
    // Insertar 100 muestras del 1 al 100 ms
    for (let i = 1; i <= 100; i++) {
      window.push(i);
    }

    const stats = window.computeStats();
    expect(stats).not.toBeNull();
    if (stats) {
      expect(stats.samples).toBe(100);
      expect(stats.minMs).toBe(1);
      expect(stats.maxMs).toBe(100);
      expect(stats.meanMs).toBe(50.5);
      expect(stats.p50Ms).toBe(51); // mediana index 50
      expect(stats.p95Ms).toBe(96); // percentil 95 index 95
      expect(stats.fpsP50).toBe(Math.round(1000 / 51));
    }
  });

  it('ignora valores no válidos (NaN, infinitos, negativos)', () => {
    const window = new MetricSampleWindow(50);
    window.push(-10);
    window.push(NaN);
    window.push(Infinity);
    expect(window.count()).toBe(0);

    window.push(16.6);
    expect(window.count()).toBe(1);
  });

  it('respeta la capacidad máxima de ventana deslizante', () => {
    const window = new MetricSampleWindow(5);
    for (let i = 1; i <= 10; i++) {
      window.push(i);
    }
    expect(window.count()).toBe(5);
    const stats = window.computeStats()!;
    expect(stats.minMs).toBe(6);
    expect(stats.maxMs).toBe(10);
  });
});
