/**
 * Utilidades matemáticas para telemetría y cálculo de percentiles (p50, p90, p95, p99)
 */

export interface FrameStats {
  samples: number;
  minMs: number;
  maxMs: number;
  meanMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  fpsP50: number;
  fpsP95: number;
}

export class MetricSampleWindow {
  private samples: number[] = [];
  private readonly capacity: number;

  constructor(capacity = 300) {
    this.capacity = capacity;
  }

  public push(valueMs: number): void {
    if (!Number.isFinite(valueMs) || valueMs <= 0) return;
    this.samples.push(valueMs);
    if (this.samples.length > this.capacity) {
      this.samples.shift();
    }
  }

  public clear(): void {
    this.samples = [];
  }

  public count(): number {
    return this.samples.length;
  }

  public computeStats(): FrameStats | null {
    if (this.samples.length === 0) return null;

    const sorted = [...this.samples].sort((a, b) => a - b);
    const n = sorted.length;

    const minMs = sorted[0]!;
    const maxMs = sorted[n - 1]!;
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const meanMs = sum / n;

    const p50Ms = this.getPercentile(sorted, 0.5);
    const p95Ms = this.getPercentile(sorted, 0.95);
    const p99Ms = this.getPercentile(sorted, 0.99);

    const fpsP50 = p50Ms > 0 ? Math.round(1000 / p50Ms) : 0;
    const fpsP95 = p95Ms > 0 ? Math.round(1000 / p95Ms) : 0;

    return {
      samples: n,
      minMs: Number(minMs.toFixed(2)),
      maxMs: Number(maxMs.toFixed(2)),
      meanMs: Number(meanMs.toFixed(2)),
      p50Ms: Number(p50Ms.toFixed(2)),
      p95Ms: Number(p95Ms.toFixed(2)),
      p99Ms: Number(p99Ms.toFixed(2)),
      fpsP50,
      fpsP95
    };
  }

  private getPercentile(sorted: number[], p: number): number {
    const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
    return sorted[idx]!;
  }
}
