# Estado Operacional del Proyecto — Universo RTS

**Archivo:** `docs/PROJECT_STATE.md`  
**Última Actualización:** 2026-10-12 22:20 UTC  
**Fase Actual:** FASE 2 · VERTICAL SLICE URBANO  
**Ticket Activo:** T22 — Zonificación, parcelas y edificación privada automatizada  
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
  - Suite de pruebas automatizadas con Vitest ejecutando 124 pruebas unitarias aprobadas (21 suites).
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
  - Topología de teselas y quadtree por cara (`tileId` canónico, grid diádica $33 \times 33$, 24 transiciones inter-cara y detector de grietas verificado $< 0.1\text{ mm}$).
  - LOD dinámico continuo (`LodQuadtree`, SSE proyectado, histéresis del 40%, sustitución atómica padre $\leftrightarrow$ hijos, balance 2:1, streaming cancelable y skirts).
  - Navegación de cámara Cesium-feel (`OrbitalCameraController`, zoom logarítmico proporcional a altitud $300\text{ km} \to 2\text{ m}$, ray picking analítico, anclaje geográfico al cursor y vector UP estable sin gimbal lock).
  - Transición continua órbita-región (`TransitionCoordinator`, Slerp de cuaterniones, niebla atmosférica diurna $80\text{ km} \to 2\text{ km}$, horizonte físico y planos de corte dinámicos anti z-fighting).
  - Navegación al suelo a 2 metros (`queryGroundUnderPosition`, `resolveGroundCollision` clamp $\ge 2.0\text{ m}$, deflexión tangencial en pendientes `slideAlongSlope` y controlador `RtsCameraController` con seguimiento de contorno del terreno).
  - Bioclimatología de Whittaker, paleta PBR sobria (12 biomas con albedos físicos, rugosidades y metalicidad) y normales topográficas analíticas $(\mathbf{T}_u \times \mathbf{T}_v)$ a todas las escalas para iluminación solar real.
- [x] **Persistencia de Dominio y Modificaciones de Terreno:**
  - Servicio transaccional SQLite ACID (`TilePersistenceDatabase`) para deltas de relieve por vértice, carreteras e inventario de depósitos naturales.
  - Versionado optimista por tesela e invalidación de caché.
  - Conservación física y no-duplicación de reservas ($R_{\text{current}} \ge 0$).
  - Supervivencia verificada a recarga de navegador y reinicio de servidor.
- [x] **Infraestructura y Red Vial Urbana (T21):**
  - Proyección de splines Catmull-Rom sobre terreno con offset anti z-fighting ($+0.12\text{ m}$).
  - Grafo vial determinista (`RoadNetworkGraph`) con auto-snapping a $5\text{ m}$, validación de pendientes máximas por calzada y enrutamiento óptimo A\*.
  - Constructor de mallas ribbon 3D (`createRoadRibbonMesh`) y controlador de edición interactivo (`RoadEditorController`).

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
|   **1**   | **VIABILIDAD DEL MUNDO 3D**      |      12       |     12      |   🟢 COMPLETADA AL 100%     |
|     2     | VERTICAL SLICE URBANO            |       7       |      1      | 🟡 EN PROGRESO (T22 activo) |
|     3     | DOMINIO ECONÓMICO                |      10       |      0      |        ⚪ PENDIENTE         |
|     4     | MULTIJUGADOR, ROLES Y POLÍTICA   |       7       |      0      |        ⚪ PENDIENTE         |
|     5     | ESTRATEGIA Y CONFLICTO           |       5       |      0      |        ⚪ PENDIENTE         |
|     6     | PLANETA DINÁMICO Y ESCALA        |       4       |      0      |        ⚪ PENDIENTE         |
|     7     | ESPACIO E INTERESTELAR           |       4       |      0      |        ⚪ PENDIENTE         |
|     8     | PRODUCCIÓN, PULIDO Y LANZAMIENTO |       7       |      0      |        ⚪ PENDIENTE         |
| **Total** | **Ciclo Completo**               |    **64**     |   **21**    |       **32.8% General**     |

---

## 4. Tickets Completados

### Fase 1 · Viabilidad del Mundo 3D (100%)
- [x] **T09:** Inicialización asíncrona de Babylon.js WebGPU, pantalla de soporte y benchmark base.
- [x] **T10:** Instanciado masivo y presupuesto GPU (Thin Instances 10k entidades).
- [x] **T11:** Generador de planeta por seeds y versión.
- [x] **T12:** Cube-sphere, océanos y escena orbital procedural.
- [x] **T13:** Precisión global, ancla local y floating origin.
- [x] **T14:** Topología de chunks, teselas y vecinos de seis caras.
- [x] **T15:** LOD dinámico, quadtree, histéresis y presupuesto de streaming.
- [x] **T16:** Cámara Cesium-feel con picking de región y zoom por altura.
- [x] **T17:** Transición orbital-regional y horizonte físico.
- [x] **T18:** Navegación al suelo a 2m, colisión y deslizamiento en pendientes.
- [x] **T19:** Biomas, materialidad PBR y normal visual a todas las escalas.
- [x] **T20:** Persistencia de ediciones de relieve, carreteras y agotamiento.

### Fase 2 · Vertical Slice Urbano
- [x] **T21:** Editor de carreteras curvas y conectividad vial.

---

## 5. Próximos Pasos Inmediatos

1. Ejecutar **T22 — Zonificación, parcelas y edificación privada automatizada** (Parcelas R/C/I, algoritmo privado construye edificios si hay carreteras, mano de obra y materiales).
2. Continuar con **T23 — Construcción estratégica, fases de obra y reparación**.
