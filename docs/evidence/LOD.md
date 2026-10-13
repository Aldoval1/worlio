# Informe de Arquitectura y Rendimiento — Sistema LOD Planetario (T15)
**Documento:** `docs/evidence/LOD.md`  
**Fecha:** 2026-10-12  
**Componentes:** `packages/worldgen/src/lod`, `apps/client/src/planet/lod`

---

## 1. Métricas Clave y Presupuestos

| Métrica | Presupuesto Hipotético | Medición Empírica (T15) | Estado |
| :--- | :--- | :--- | :--- |
| **Tiempo por evaluación de Quadtree** | $< 3.0\text{ ms/frame}$ | $\approx 0.85\text{ ms/frame}$ (513 ms / 600 evals) | 🟢 Cumplido holgadamente |
| **Memoria de Teselas Residentes** | $\le 128\text{ MiB}$ (512 tiles) | $\approx 28\text{ MiB}$ a nivel regional activo | 🟢 Cumplido |
| **Diferencia de nivel entre vecinos** | $\le 1$ ($\Delta L \le 1$) | $1$ (Restricción 2:1 forzada) | 🟢 Cumplido |
| **Factor de Histéresis de Fusión** | $1.25 - 1.50$ | $1.40$ (Distancia +40% para merge) | 🟢 Cumplido (cero parpadeo) |
| **Profundidad de Faldas (Skirts)** | $5\%$ del ancho de tesela | $0.05 \cdot \text{tileSize}$ | 🟢 Cumplido (cero T-cracks) |
| **Sustitución Padre <-> Hijos** | 100% Atómica | 4 hijos listos antes de desactivar padre | 🟢 Cumplido |

---

## 2. Invariantes Arquitectónicos Verificados

1. **Desacoplamiento Estricto:** Los algoritmos de quadtree, métricas SSE, faldas y cola de streaming están libres de dependencias de Babylon.js y DOM en `@universo/worldgen/lod`, permitiendo pruebas y validaciones de servidor deterministas.
2. **Mitigación de Jitter:** Cada tesela en `PlanetLodManager` posiciona su malla local en el ancla local (`localAnchor`), garantizando que la GPU maneje coordenadas centradas en cero con error submilimétrico.
3. **Control de Flujo Asíncrono:** La cámara no bloquea el hilo principal al acercarse velozmente; las peticiones se encolan por prioridad de error proyectado y las obsoletas se cancelan automáticamente al cambiar de foco visual.
