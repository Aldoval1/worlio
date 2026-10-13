# Métricas de Producto, Instrumentación y Calidad — Universo RTS

**Archivo:** `docs/PRODUCT_METRICS.md`  
**Edición:** Octubre 2026

---

## 1. Métricas Técnicas Cuantitativas e Instrumentación

| Métrica                                   | Objetivo P0/P1                        | Objetivo Producción                        | Método de Medición                                                                       |
| :---------------------------------------- | :------------------------------------ | :----------------------------------------- | :--------------------------------------------------------------------------------------- |
| **FPS Mediana (p50)**                     | $\ge 55$ FPS                          | $\ge 60$ FPS (1080p)                       | Muestreo de intervalos de frame en ventana móvil de 120 frames.                          |
| **FPS Percentil 95 (p95)**                | $\ge 45$ FPS (frame time $< 22.2$ ms) | $\ge 58$ FPS (frame time $< 17.2$ ms)      | Percentil 95 de frame time registrado en telemetría client.                              |
| **Draw Calls por Frame**                  | $\le 200$ en ciudad densa             | $\le 150$ (optimizando con Thin Instances) | Inspector Babylon.js / WebGPU profiler.                                                  |
| **Memoria VRAM Estimada**                 | $\le 512$ MB en navegador             | $\le 1024$ MB en escala planetaria         | Suma de buffers de vértices, índices, texturas y uniform buffers.                        |
| **Tiempo de Generación Planetaria (CPU)** | $< 4.0$ segundos para malla orbital   | $< 1.5$ segundos (asíncrono en Workers)    | `performance.now()` en `sampleTerrain` y construcción de caras.                          |
| **Latencia de Comando (RTT)**             | $< 80$ ms en local                    | $< 180$ ms p95 en servidor WAN             | Delta entre emisión de comando del cliente y ack del servidor.                           |
| **Duración de Tick de Simulación**        | $< 15$ ms por tick                    | $< 25$ ms con 100 clientes y 10k entidades | `process.hrtime()` en loop de simulación del servidor.                                   |
| **Tasa de Corrupción Económica**          | **0.00%** (Cero tolerancia)           | **0.00%** (Cero tolerancia)                | Auditoría: $\Delta \text{Stock} = \text{Entradas} - \text{Salidas} - \text{EnTránsito}$. |

---

## 2. Separación de Criterios de Aceptación

### Criterios Automatizados (Verificación por Máquina):

- Validación de tipos en compilación (`pnpm check`).
- Suite de pruebas unitarias y de integración (`pnpm test` con Vitest).
- Invariantes matemáticos de inventario (`available >= 0`).
- Roundtrip de serialización y deserialización de contratos.
- Detección de fugas de memoria en 50 ciclos de apertura/cierre de escenas.

### Criterios Perceptuales (Requieren Juicio Humano):

- Legibilidad estética de siluetas de edificios y colores en cámara cenital.
- Confort de movimiento de la cámara orbital (ausencia de mareo o vértigo).
- Coherencia y naturalidad de las transiciones entre biomas (nieve, bosque, desierto).
- Curva de aprendizaje y claridad cognitiva del tutorial de la primera sesión.

---

## 3. Presupuesto de Costos Operacionales y Supuestos

- **Almacenamiento Persistente:**
  - Base de datos SQLite inicial: $\approx 10 - 50$ MB para un planeta con 1.000 parcelas y 500 envíos activos.
  - Snapshot periódico: compresión gzip $\approx 2 - 5$ MB por snapshot.
- **Memoria RAM Servidor:**
  - Modelo en memoria de 1 planeta y 100 clientes conectados: $\approx 150 - 300$ MB RAM en Node.js.
  - Aislamiento de colas y buffers de WebSocket: límite estricto de 64 KB por mensaje y cuota de 50 mensajes/segundo por cliente para evitar DoS por saturación de memoria.
- **Presupuesto Reversible:** El desarrollo se mantiene en infraestructura local y nivel gratuito/bajo de Railway sin incurrir en costes de pago hasta la fase de pruebas de carga multi-usuario en Fase 6.
