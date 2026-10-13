import { initializeWebGPUEngine, WebGPUNotSupportedError } from './graphics/webgpu.js';
import { createBenchmarkScene } from './scenes/benchmarkScene.js';
import { ClientTelemetryTracker } from './telemetry/index.js';
import type { ServerMessage, ClientMessage } from '@universo/shared';

async function bootstrap() {
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  const fallbackEl = document.getElementById('fallback');
  const hudFps = document.getElementById('hud-fps');
  const hudWs = document.getElementById('hud-ws');
  const hudEngine = document.getElementById('hud-engine');
  const invMadera = document.getElementById('inv-madera');
  const invPiedra = document.getElementById('inv-piedra');
  const btnReserve = document.getElementById('btn-reserve');

  const telemetry = new ClientTelemetryTracker();

  try {
    // 1. Inicialización exclusiva de WebGPU (T09)
    const { engine, initDurationMs, adapterInfo } = await initializeWebGPUEngine(canvas);
    console.log(`🚀 Babylon.js WebGPUEngine inicializado en ${initDurationMs} ms.`);

    if (hudEngine) {
      const adapterDesc = adapterInfo?.architecture || adapterInfo?.vendor || 'WebGPU Nativo';
      hudEngine.textContent = `WebGPU (${adapterDesc})`;
    }

    // 2. Crear escena de benchmark (100 bloques, suelo, iluminación, cámara de órbita)
    const { scene, boxCount, firstRenderDurationMs } = createBenchmarkScene(engine, canvas);
    console.log(`📦 Escena de benchmark creada con ${boxCount} bloques. Primer frame: ${firstRenderDurationMs} ms.`);

    // 3. Bucle de renderizado
    let lastRenderTime = performance.now();
    engine.runRenderLoop(() => {
      const now = performance.now();
      const delta = now - lastRenderTime;
      lastRenderTime = now;
      telemetry.recordFrameTime(delta);

      scene.render();

      const stats = telemetry.getFrameStats();
      if (stats && hudFps) {
        hudFps.textContent = `${stats.fpsP50} / ${stats.fpsP95}`;
      }
    });

    window.addEventListener('resize', () => {
      engine.resize();
    });

    // 4. Conexión WebSocket al servidor autoritativo
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host || 'localhost:3000';
    const socket = new WebSocket(`${wsProtocol}//${wsHost}`);

    socket.addEventListener('open', () => {
      if (hudWs) {
        hudWs.textContent = '🟢 Conectado';
        hudWs.style.color = '#14B8A6';
      }
      const syncReq: ClientMessage = {
        type: 'REQUEST_SYNC',
        planetId: 'terra-prime' as any
      };
      socket.send(JSON.stringify(syncReq));
    });

    socket.addEventListener('message', (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        if (msg.type === 'SYNC_SNAPSHOT') {
          const madera = msg.inventories.find((i) => (i.resourceId as string) === 'madera');
          const piedra = msg.inventories.find((i) => (i.resourceId as string) === 'piedra');
          if (invMadera && madera) invMadera.textContent = `${madera.quantity - madera.reserved} / ${madera.quantity}`;
          if (invPiedra && piedra) invPiedra.textContent = `${piedra.quantity - piedra.reserved} / ${piedra.quantity}`;
        } else if (msg.type === 'EVENT_NOTIFICATION' && msg.eventType === 'INVENTORY_RESERVED') {
          socket.send(JSON.stringify({ type: 'REQUEST_SYNC', planetId: 'terra-prime' }));
        }
      } catch (err) {
        console.error('Error parseando mensaje WS:', err);
      }
    });

    socket.addEventListener('close', () => {
      if (hudWs) {
        hudWs.textContent = '🔴 Desconectado';
        hudWs.style.color = '#D96A64';
      }
    });

    if (btnReserve) {
      btnReserve.addEventListener('click', () => {
        const idempotencyKey = `shipment-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const cmd: ClientMessage = {
          type: 'DISPATCH_SHIPMENT',
          idempotencyKey,
          originId: 'almacen-central' as any,
          destinationId: 'taller-01' as any,
          resourceId: 'madera' as any,
          amount: 50
        };
        socket.send(JSON.stringify(cmd));
      });
    }

  } catch (err) {
    if (err instanceof WebGPUNotSupportedError) {
      console.warn('⚠️ WebGPU no disponible. Mostrando pantalla de incompatibilidad.');
      if (fallbackEl) fallbackEl.classList.remove('hidden');
    } else {
      console.error('Error fatal iniciando cliente 3D:', err);
    }
  }
}

window.addEventListener('DOMContentLoaded', bootstrap);
