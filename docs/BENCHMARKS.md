# Registro de Benchmarks y Telemetría de Hardware — Universo RTS
**Archivo:** `docs/BENCHMARKS.md`  
**Edición:** Octubre 2026

---

## 1. Identificación del Entorno de Evaluación
- **Sistema Operativo:** macOS Darwin 24.x (Apple Silicon `arm64`)
- **GPU / Chipset:** Apple Silicon GPU (Arquitectura unificada Metal / WebGPU)
- **Navegadores Objetivo:**
  - Google Chrome 129+ (WebGPU nativo habilitado)
  - Safari 18+ (macOS Sequoia, WebGPU activado)
- **Resolución de Prueba:** 1080p ($1920 \times 1080$), Device Pixel Ratio (DPR) = 2.0 (Retina).

---

## 2. Línea Base Observada en Preproducción (Fase 0)

| Métrica | Objetivo Presupuestado | Valor Medido en Máquina Local | Estado |
| :--- | :--- | :--- | :---: |
| **Tiempo de Compilación TypeScript** | $< 3.0$ s | **0.95 s** (`tsc -b`) | ✅ DENTRO DE PRESUPUESTO |
| **Tiempo de Build Cliente (Vite + Babylon)** | $< 10.0$ s | **5.03 s** | ✅ DENTRO DE PRESUPUESTO |
| **Tiempo de Ejecución Suite de Tests** | $< 2.0$ s | **0.47 s** (16 tests) | ✅ DENTRO DE PRESUPUESTO |
| **Generación de Muestra de Terreno (`sampleTerrain`)** | $< 0.1$ ms / punto | **0.012 ms** / consulta | ✅ DENTRO DE PRESUPUESTO |
| **Latencia Local HTTP Health Check** | $< 50$ ms | **3.8 ms** | ✅ DENTRO DE PRESUPUESTO |
| **Consumo de Memoria Servidor en Reposo** | $< 100$ MB | **38 MB** RSS Node.js | ✅ DENTRO DE PRESUPUESTO |

---

## 3. Modo Diagnóstico en Cliente 3D
Para activar el panel de diagnóstico extendido de telemetría en el navegador:
```
http://localhost:3000/?debug=1
```
Cuando `debug=1` está activo:
- Muestra el proveedor y arquitectura del adaptador WebGPU (`adapter.info`).
- Muestra la mediana (p50) y percentil 95 (p95) de intervalos de frame (ms y FPS).
- Muestra el tamaño del viewport y DPR real.
- Permite verificar la tasa de refresco sin confiar ciegamente en lecturas instantáneas aisladas.
