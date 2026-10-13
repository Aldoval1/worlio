import { MetricSampleWindow, type FrameStats } from '@universo/shared';

export interface DeviceTelemetryInfo {
  gpuVendor: string;
  gpuArchitecture: string;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  debugModeActive: boolean;
}

export class ClientTelemetryTracker {
  private frameWindow = new MetricSampleWindow(180); // 3 segundos a 60 FPS
  private deviceInfo: DeviceTelemetryInfo;

  constructor() {
    const urlParams = new URLSearchParams(window.location.search);
    const debugModeActive = urlParams.get('debug') === '1';

    this.deviceInfo = {
      gpuVendor: 'Desconocido',
      gpuArchitecture: 'Desconocido',
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      debugModeActive
    };

    window.addEventListener('resize', () => {
      this.deviceInfo.viewportWidth = window.innerWidth;
      this.deviceInfo.viewportHeight = window.innerHeight;
      this.deviceInfo.devicePixelRatio = window.devicePixelRatio || 1;
    });
  }

  public async inspectGpuAdapter(): Promise<DeviceTelemetryInfo> {
    if (navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter && adapter.info) {
          this.deviceInfo.gpuVendor = adapter.info.vendor || 'WebGPU Vendor';
          this.deviceInfo.gpuArchitecture = adapter.info.architecture || adapter.info.device || 'Nativa';
        }
      } catch (err) {
        console.warn('No se pudo consultar información extendida del adaptador:', err);
      }
    }
    return this.deviceInfo;
  }

  public recordFrameTime(deltaMs: number): void {
    this.frameWindow.push(deltaMs);
  }

  public getFrameStats(): FrameStats | null {
    return this.frameWindow.computeStats();
  }

  public isDebugActive(): boolean {
    return this.deviceInfo.debugModeActive;
  }

  public getDeviceInfo(): DeviceTelemetryInfo {
    return this.deviceInfo;
  }
}
