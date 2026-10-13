import {
  WebGPUEngine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  StandardMaterial,
  Color3
} from '@babylonjs/core';
import type { ServerMessage, ClientMessage } from '@universo/shared';

async function bootstrap() {
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  const fallbackEl = document.getElementById('fallback');
  const hudFps = document.getElementById('hud-fps');
  const hudWs = document.getElementById('hud-ws');
  const invMadera = document.getElementById('inv-madera');
  const invPiedra = document.getElementById('inv-piedra');
  const btnReserve = document.getElementById('btn-reserve');

  // 1. Verificación obligatoria de WebGPU exclusivo (ADR-0001)
  if (!navigator.gpu || !(await WebGPUEngine.IsSupportedAsync)) {
    if (fallbackEl) fallbackEl.classList.remove('hidden');
    console.error('❌ WebGPU no soportado en este navegador.');
    return;
  }

  // 2. Inicialización del motor Babylon.js WebGPU
  const engine = new WebGPUEngine(canvas, {
    powerPreference: 'high-performance',
    antialias: true
  });
  await engine.initAsync();

  // 3. Crear escena 3D en convención right-handed (metros)
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  scene.clearColor = new Color3(0.027, 0.082, 0.149).toColor4(1.0); // #071526

  // 4. Cámara orbital (ArcRotateCamera)
  const camera = new ArcRotateCamera(
    'orbitCamera',
    Math.PI / 4,
    Math.PI / 3,
    50,
    new Vector3(0, 0, 0),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = 500;
  camera.wheelPrecision = 20;

  // 5. Iluminación
  const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
  hemiLight.intensity = 0.6;
  hemiLight.diffuse = new Color3(0.9, 0.95, 1.0);

  const dirLight = new DirectionalLight('dirLight', new Vector3(-0.5, -1, -0.5), scene);
  dirLight.intensity = 0.8;
  dirLight.diffuse = new Color3(1.0, 0.95, 0.8);

  // 6. Terreno de prueba (Plano 40x40m con material PBR / estándar estilizado)
  const ground = MeshBuilder.CreateGround('cityGround', { width: 40, height: 40, subdivisions: 20 }, scene);
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.196, 0.321, 0.204); // #325234
  groundMat.specularColor = new Color3(0.05, 0.05, 0.05);
  ground.material = groundMat;

  // Representación visual del almacén central
  const warehouse = MeshBuilder.CreateBox('almacenCentral', { width: 4, height: 2, depth: 3 }, scene);
  warehouse.position = new Vector3(0, 1, 0);
  const warehouseMat = new StandardMaterial('warehouseMat', scene);
  warehouseMat.diffuseColor = new Color3(0.4, 0.25, 0.15); // Madera oscura
  warehouse.material = warehouseMat;

  // 7. Bucle de renderizado
  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener('resize', () => {
    engine.resize();
  });

  // 8. Telemetría de FPS
  let frameTimes: number[] = [];
  let lastTime = performance.now();
  scene.onAfterRenderObservable.add(() => {
    const now = performance.now();
    const delta = now - lastTime;
    lastTime = now;
    frameTimes.push(delta);
    if (frameTimes.length >= 60) {
      frameTimes.sort((a, b) => a - b);
      const p50 = (1000 / frameTimes[Math.floor(frameTimes.length * 0.5)]!).toFixed(0);
      const p95 = (1000 / frameTimes[Math.floor(frameTimes.length * 0.95)]!).toFixed(0);
      if (hudFps) hudFps.textContent = `${p50} / ${p95}`;
      frameTimes = [];
    }
  });

  // 9. Conexión WebSocket al servidor autoritativo
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
        const p = msg.payload as { lotId: string; amount: number; remainingAvailable: number };
        console.log(`📦 Notificación: Reserva confirmada en lote ${p.lotId}: ${p.amount} unidades.`);
        // Solicitar sync actualizado
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

  // 10. Interacción: Despachar orden de envío con clave de idempotencia única
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
      console.log(`🚀 Orden de envío emitida (IdempotencyKey: ${idempotencyKey})`);
    });
  }
}

window.addEventListener('DOMContentLoaded', bootstrap);
