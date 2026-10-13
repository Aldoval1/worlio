# Estado Operacional del Proyecto — Universo RTS

**Archivo:** `docs/PROJECT_STATE.md`  
**Última Actualización:** 2026-10-12 21:35 UTC  
**Fase Actual:** FASE 1 · VIABILIDAD DEL MUNDO 3D  
**Ticket Activo:** T14 — Topología de chunks, teselas y vecinos de seis caras  
**Rama Git:** `main`

---

## 1. Verdad Operacional y Hechos Confirmados

- [x] **Entorno Local y Runtimes:**
  - Node.js LTS `v20.18.0` instalado y operativo.
  - pnpm `v12.11.2` instalado y operativo.
  - Git configurado con autor `Aaron Bacallao` y remoto `git@github.com:Aldoval1/worlio.git`.
  - Monorepo pnpm configurado (`@universo/shared`, `@universo/worldgen`, `@universo/domain`, `@universo/server`, `@universo/client`).
- [x] **Calidad y Pipeline:**
  - TypeScript project references (`tsc -b`) compilando limpiamente sin errores.
  - Suite de pruebas automatizadas con Vitest ejecutando 49 pruebas unitarias aprobadas.
  - CI de GitHub Actions configurado en `.github/workflows/ci.yml`.
  - Zod schemas en runtime para contratos de red y mensajes de cliente-servidor.
  - Telemetría percentil (`p50`, `p90`, `p99`) y validador de catálogo de activos.
  - UX tokens y máquina de estados del HUD progresivo (`HudStateMachine`).
- [x] **Motor Gráfico WebGPU:**
  - Babylon.js `WebGPUEngine` exclusivo con inicialización asíncrona y pantalla explícita de incompatibilidad.
  - Benchmark de Thin Instances: 1.000 y 10.000 edificios en 1 único draw call con buffer de 640 KB.
  - Geometría Cube-Sphere de 6 caras ($R = 125.000\text{ m}$) con concha oceánica esférica continua y sampling de biomas determinista.
  - Precisión numérica doble en CPU (`number` IEEE-754), coordenadas geodésicas y marcos tangentes ENU locales.
  - Floating Origin Manager en cliente con rebase a 2.000 m y clipping adaptativo de $0.1\text{ m}$ a $1.000.000\text{ m}$ mitigando jitter en GPU Float32.

---

## 2. Invariantes del Proyecto (Decreto Maestro)

1. **Un Universo Compartido:** Una única fuente de verdad lógica. Zoom in / zoom out no crea mundos paralelos ni destruye simulación.
2. **WebGPU Exclusivo:** Babylon.js `WebGPUEngine` como motor gráfico obligatorio. Sin WebGL ni degradación.
3. **Servidor Autoritativo:** El cliente nunca decide la física económica ni inventarios.
4. **Economía Física:** Cero teletransporte. Bienes materiales y trueque en etapas I–IV.
5. **Persistencia 24/7:** Simulación offline calculada por el servidor al reconectar.

---

## 3. Estado de Fases

|   Fase    | Nombre                           | Total Tickets | Completados |           Estado            |
| :-------: | :------------------------------- | :-----------: | :---------: | :-------------------------: |
|   **0**   | **PREPRODUCCIÓN**                |       8       |      8      |   🟢 COMPLETADA AL 100%     |
|     1     | VIABILIDAD DEL MUNDO 3D          |      12       |      5      | 🟡 EN PROGRESO (T14 activo) |
|     2     | VERTICAL SLICE URBANO            |       7       |      0      |        ⚪ PENDIENTE         |
|     3     | DOMINIO ECONÓMICO                |      10       |      0      |        ⚪ PENDIENTE         |
|     4     | MULTIJUGADOR, ROLES Y POLÍTICA   |       7       |      0      |        ⚪ PENDIENTE         |
|     5     | ESTRATEGIA Y CONFLICTO           |       5       |      0      |        ⚪ PENDIENTE         |
|     6     | PLANETA DINÁMICO Y ESCALA        |       4       |      0      |        ⚪ PENDIENTE         |
|     7     | ESPACIO E INTERESTELAR           |       4       |      0      |        ⚪ PENDIENTE         |
|     8     | PRODUCCIÓN, PULIDO Y LANZAMIENTO |       7       |      0      |        ⚪ PENDIENTE         |
| **Total** | **Ciclo Completo**               |    **64**     |   **13**    |       **20.3% General**     |

---

## 4. Tickets Completados de Fase 1

- [x] **T09:** Inicialización asíncrona de Babylon.js WebGPU, pantalla de soporte y benchmark base.
- [x] **T10:** Instanciado masivo y presupuesto GPU (Thin Instances 10k entidades).
- [x] **T11:** Generación planetaria procedural determinista y muestreo de terreno.
- [x] **T12:** Cube-sphere, océanos y escena orbital procedural.
- [x] **T13:** Precisión global, ancla local y floating origin.

---

## 5. Próximos Pasos Inmediatos

1. Ejecutar **T14 — Topología de chunks, teselas y vecinos de seis caras** (`packages/worldgen/src/tiles`, identificador `tileId`, grid diádica $33 \times 33$, vecinos intra/inter-cara y cosido de bordes).
2. Continuar con **T15 — LOD dinámico, quadtree, histéresis y presupuesto de streaming**.
