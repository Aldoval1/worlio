import { MetricSampleWindow, type FrameStats } from '@universo/shared';

export interface ServerTelemetrySnapshot {
  activeConnections: number;
  totalCommandsProcessed: number;
  totalErrors: number;
  errorsByCode: Record<string, number>;
  tickStats: FrameStats | null;
  uptimeSeconds: number;
}

export class ServerTelemetryTracker {
  private tickWindow = new MetricSampleWindow(300);
  private activeConnections = 0;
  private totalCommands = 0;
  private totalErrors = 0;
  private errorsByCode: Record<string, number> = {};

  public onConnectionOpened(): void {
    this.activeConnections++;
  }

  public onConnectionClosed(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  public recordCommandProcessed(): void {
    this.totalCommands++;
  }

  public recordError(code: string): void {
    this.totalErrors++;
    this.errorsByCode[code] = (this.errorsByCode[code] || 0) + 1;
  }

  public recordTickDuration(durationMs: number): void {
    this.tickWindow.push(durationMs);
  }

  public getSnapshot(): ServerTelemetrySnapshot {
    return {
      activeConnections: this.activeConnections,
      totalCommandsProcessed: this.totalCommands,
      totalErrors: this.totalErrors,
      errorsByCode: { ...this.errorsByCode },
      tickStats: this.tickWindow.computeStats(),
      uptimeSeconds: Math.floor(process.uptime())
    };
  }
}
