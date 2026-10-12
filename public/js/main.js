import { Mat4 } from './math.js';
import { createPlaneGeometry } from './plane.js';
import { OrbitCamera } from './camera.js';
import { planeShaderWGSL } from './shaders.js';

class WorlioApp {
  constructor() {
    this.canvas = document.getElementById('webgpu-canvas');
    this.fallbackEl = document.getElementById('webgpu-fallback');
    this.fallbackMsgEl = document.getElementById('fallback-message');
    this.fpsCounterEl = document.getElementById('fps-counter');
    this.adapterInfoEl = document.getElementById('gpu-adapter');
    this.btnAutoRotate = document.getElementById('btn-auto-rotate');
    this.btnResetCam = document.getElementById('btn-reset-cam');

    this.device = null;
    this.context = null;
    this.pipeline = null;
    this.depthTexture = null;

    this.vertexBuffer = null;
    this.indexBuffer = null;
    this.uniformBuffer = null;
    this.bindGroup = null;

    this.planeMesh = null;
    this.camera = null;

    // Uniform buffer memory layout: 40 floats = 160 bytes
    // viewProj: 16 floats (0..15)
    // model: 16 floats (16..31)
    // cameraPos: 3 floats (32..34)
    // time: 1 float (35)
    // planeSize: 1 float (36)
    // padding: 3 floats (37..39)
    this.uniformData = new Float32Array(40);
    this.modelMatrix = Mat4.create();

    // Diagnósticos de FPS
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fpsTimer = 0;

    this.setupUI();
  }

  setupUI() {
    this.camera = new OrbitCamera(this.canvas);

    this.btnAutoRotate.addEventListener('click', () => {
      this.camera.autoRotate = !this.camera.autoRotate;
      this.btnAutoRotate.textContent = `Auto-Rotación: ${this.camera.autoRotate ? 'ON' : 'OFF'}`;
      this.btnAutoRotate.classList.toggle('btn-primary', this.camera.autoRotate);
      this.btnAutoRotate.classList.toggle('btn-secondary', !this.camera.autoRotate);
    });

    this.btnResetCam.addEventListener('click', () => {
      this.camera.reset();
    });
  }

  showFallback(message) {
    if (this.fallbackMsgEl && message) {
      this.fallbackMsgEl.textContent = message;
    }
    if (this.fallbackEl) {
      this.fallbackEl.classList.remove('hidden');
    }
  }

  async init() {
    // 1. Comprobar si el navegador soporta WebGPU
    if (!navigator.gpu) {
      this.showFallback('Tu navegador no soporta WebGPU o la aceleración por hardware está inhabilitada.');
      return;
    }

    try {
      // 2. Solicitar adaptador GPU
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!adapter) {
        this.showFallback('No se encontró un adaptador GPU compatible con WebGPU en tu sistema.');
        return;
      }

      // Mostrar info del adaptador si está disponible
      if (adapter.info) {
        const info = adapter.info;
        const gpuName = info.description || info.device || info.architecture || 'GPU WebGPU';
        this.adapterInfoEl.textContent = gpuName.substring(0, 24);
      } else {
        this.adapterInfoEl.textContent = 'WebGPU Nativo';
      }

      // 3. Solicitar dispositivo lógico
      this.device = await adapter.requestDevice();

      // Control de pérdida de contexto
      this.device.lost.then((info) => {
        console.error(`⚠️ Dispositivo WebGPU perdido: ${info.message}`, info.reason);
        this.showFallback(`El dispositivo GPU se reinició (${info.reason}).`);
      });

      // 4. Configurar canvas context
      this.context = this.canvas.getContext('webgpu');
      const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

      this.context.configure({
        device: this.device,
        format: presentationFormat,
        alphaMode: 'premultiplied'
      });

      // 5. Crear la geometría del Plano 3D (40x40 metros)
      const planeSize = 40.0;
      this.planeMesh = createPlaneGeometry(planeSize, 40);

      // Vertex Buffer
      this.vertexBuffer = this.device.createBuffer({
        label: 'Worlio Plane Vertex Buffer',
        size: this.planeMesh.vertexData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      });
      this.device.queue.writeBuffer(this.vertexBuffer, 0, this.planeMesh.vertexData);

      // Index Buffer
      this.indexBuffer = this.device.createBuffer({
        label: 'Worlio Plane Index Buffer',
        size: this.planeMesh.indexData.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
      });
      this.device.queue.writeBuffer(this.indexBuffer, 0, this.planeMesh.indexData);

      // Uniform Buffer (alineado a 256 bytes)
      const uniformBufferSize = Math.ceil(this.uniformData.byteLength / 256) * 256;
      this.uniformBuffer = this.device.createBuffer({
        label: 'Worlio Uniform Buffer',
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });

      // 6. Shader Module
      const shaderModule = this.device.createShaderModule({
        label: 'Worlio Plane Shaders',
        code: planeShaderWGSL
      });

      // 7. Render Pipeline
      this.pipeline = this.device.createRenderPipeline({
        label: 'Worlio Plane Pipeline',
        layout: 'auto',
        vertex: {
          module: shaderModule,
          entryPoint: 'vs_main',
          buffers: [
            {
              // Interleaved stride: 3 floats pos + 3 floats normal + 2 floats uv = 8 floats = 32 bytes
              arrayStride: 32,
              stepMode: 'vertex',
              attributes: [
                { shaderLocation: 0, offset: 0, format: 'float32x3' },  // position
                { shaderLocation: 1, offset: 12, format: 'float32x3' }, // normal
                { shaderLocation: 2, offset: 24, format: 'float32x2' }  // uv
              ]
            }
          ]
        },
        fragment: {
          module: shaderModule,
          entryPoint: 'fs_main',
          targets: [
            {
              format: presentationFormat
            }
          ]
        },
        primitive: {
          topology: 'triangle-list',
          cullMode: 'none' // Permitir ver el plano desde cualquier ángulo
        },
        depthStencil: {
          depthWriteEnabled: true,
          depthCompare: 'less',
          format: 'depth24plus'
        }
      });

      // 8. Bind Group
      this.bindGroup = this.device.createBindGroup({
        label: 'Worlio Uniform Bind Group',
        layout: this.pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: this.uniformBuffer }
          }
        ]
      });

      // 9. Manejar redimensionamiento de pantalla
      window.addEventListener('resize', () => this.handleResize());
      this.handleResize();

      // 10. Iniciar bucle de renderizado
      requestAnimationFrame((now) => this.render(now));

    } catch (err) {
      console.error('Error inicializando WebGPU:', err);
      this.showFallback(`Error al iniciar WebGPU: ${err.message}`);
    }
  }

  handleResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayWidth = Math.floor(window.innerWidth * dpr);
    const displayHeight = Math.floor(window.innerHeight * dpr);

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;

      if (this.depthTexture) {
        this.depthTexture.destroy();
      }

      this.depthTexture = this.device.createTexture({
        size: [displayWidth, displayHeight],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT
      });
    }
  }

  render(currentTime) {
    const dt = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = currentTime;

    // Medición de FPS
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      const fps = Math.round(this.frameCount / this.fpsTimer);
      this.fpsCounterEl.textContent = `${fps}`;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    // Actualizar cámara
    const aspect = this.canvas.width / this.canvas.height;
    const { viewProj, position } = this.camera.update(dt, aspect);

    // Actualizar matriz de modelo (el plano permanece en el origen [0, 0, 0])
    Mat4.identity(this.modelMatrix);

    // Llenar buffer de uniformes
    // 0..15: viewProj
    this.uniformData.set(viewProj, 0);
    // 16..31: model
    this.uniformData.set(this.modelMatrix, 16);
    // 32..34: cameraPos
    this.uniformData[32] = position[0];
    this.uniformData[33] = position[1];
    this.uniformData[34] = position[2];
    // 35: time
    this.uniformData[35] = currentTime * 0.001;
    // 36: planeSize
    this.uniformData[36] = this.planeMesh.size;

    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformData);

    // Crear command encoder
    const commandEncoder = this.device.createCommandEncoder();

    // Vista de color actual del canvas
    const currentView = this.context.getCurrentTexture().createView();

    // Render pass
    const renderPassDescriptor = {
      colorAttachments: [
        {
          view: currentView,
          clearValue: { r: 0.03, g: 0.04, b: 0.06, a: 1.0 }, // Fondo cielo oscuro espacial
          loadOp: 'clear',
          storeOp: 'store'
        }
      ],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store'
      }
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.setIndexBuffer(this.indexBuffer, 'uint16');
    passEncoder.drawIndexed(this.planeMesh.indexCount);
    passEncoder.end();

    // Enviar comandos a la cola de la GPU
    this.device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame((now) => this.render(now));
  }
}

// Iniciar aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
  const app = new WorlioApp();
  app.init();
});
