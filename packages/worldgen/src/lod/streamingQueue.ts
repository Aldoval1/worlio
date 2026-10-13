import type { TileId } from '../tiles/types.js';
import type { TileGenerationJob } from './types.js';

/**
 * Cola de streaming con priorización basada en error proyectado (SSE)
 * y descarte automático de trabajos obsoletos.
 */
export class StreamingJobQueue {
  private jobs: TileGenerationJob[] = [];
  private jobMap = new Map<TileId, TileGenerationJob>();
  private completedCount = 0;
  private cancelledCount = 0;

  public enqueue(jobData: Omit<TileGenerationJob, 'isCancelled' | 'createdAt'>): void {
    const existing = this.jobMap.get(jobData.id);
    if (existing) {
      if (!existing.isCancelled) {
        // Actualizar prioridad si el nuevo cálculo es mayor
        if (jobData.priority > existing.priority) {
          existing.priority = jobData.priority;
          this.sortJobs();
        }
        return;
      }
      // Si estaba cancelado, revivirlo
      existing.isCancelled = false;
      existing.priority = jobData.priority;
      this.sortJobs();
      return;
    }

    const job: TileGenerationJob = {
      ...jobData,
      isCancelled: false,
      createdAt: performance.now()
    };

    this.jobs.push(job);
    this.jobMap.set(job.id, job);
    this.sortJobs();
  }

  public cancel(id: TileId): boolean {
    const job = this.jobMap.get(id);
    if (job && !job.isCancelled) {
      job.isCancelled = true;
      this.cancelledCount++;
      return true;
    }
    return false;
  }

  /**
   * Cancela de forma atómica todas las peticiones cuyos IDs ya no sean requeridos
   * por el árbol tras un desplazamiento rápido de cámara.
   */
  public cancelStaleJobs(validIds: Set<TileId>): number {
    let cancelled = 0;
    for (const job of this.jobs) {
      if (!job.isCancelled && !validIds.has(job.id)) {
        job.isCancelled = true;
        this.cancelledCount++;
        cancelled++;
      }
    }
    return cancelled;
  }

  /**
   * Extrae un lote de trabajos de máxima prioridad respetando el presupuesto de frame.
   */
  public dequeueBatch(maxBatchSize: number): TileGenerationJob[] {
    const batch: TileGenerationJob[] = [];

    while (this.jobs.length > 0 && batch.length < maxBatchSize) {
      const top = this.jobs.shift();
      if (!top) break;

      if (top.isCancelled) {
        this.jobMap.delete(top.id);
        continue;
      }

      this.jobMap.delete(top.id);
      this.completedCount++;
      batch.push(top);
    }

    return batch;
  }

  public get pendingCount(): number {
    let count = 0;
    for (const job of this.jobs) {
      if (!job.isCancelled) count++;
    }
    return count;
  }

  public get totalEnqueued(): number {
    return this.jobs.length;
  }

  public get completedTotal(): number {
    return this.completedCount;
  }

  public get cancelledTotal(): number {
    return this.cancelledCount;
  }

  public clear(): void {
    for (const job of this.jobs) {
      if (!job.isCancelled) {
        this.cancelledCount++;
      }
    }
    this.jobs = [];
    this.jobMap.clear();
  }

  private sortJobs(): void {
    // Ordenar de mayor a menor prioridad
    this.jobs.sort((a, b) => b.priority - a.priority);
  }
}
