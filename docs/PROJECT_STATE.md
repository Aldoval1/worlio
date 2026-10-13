# Estado Operacional del Proyecto — Universo RTS
**Archivo:** `docs/PROJECT_STATE.md`  
**Última Actualización:** 2026-10-12 19:55 UTC  
**Fase Actual:** FASE 0 · PREPRODUCCIÓN  
**Ticket Activo:** T01 — Visión, restricciones, referentes y GDD verificable  
**Rama Git:** `main`

---

## 1. Verdad Operacional y Hechos Confirmados
- [x] **Entorno Local y Runtimes:**
  - Node.js LTS `v20.18.0` instalado y operativo.
  - pnpm `v12.11.2` instalado globalmente y operativo.
  - Git configurado con autor `Aaron Bacallao` y remoto `git@github.com:Aldoval1/worlio.git`.
- [x] **Base de Despliegue en Railway:**
  - Servidor Express en `server.js` preparado para Railway (`PORT` dinámico, `0.0.0.0`, `/health`, Dockerfile, railway.json).
  - Repositorio inicial sincronizado con GitHub `origin/main` (commit `ade99cc`).
- [x] **Prompt Maestro A0:**
  - Directrices asumidas: Equipo virtual completo, disciplina epistemológica, modo autónomo activado, stop-authority fijada.
  - Documentos base inicializados: `AGENTS.md`, `docs/00_VISION.md`.

---

## 2. Invariantes del Proyecto (Decreto Maestro)
1. **Un Universo Compartido:** Una única fuente de verdad lógica. Zoom in / zoom out no crea mundos paralelos ni destruye simulación.
2. **WebGPU Exclusivo:** Babylon.js `WebGPUEngine` como motor gráfico obligatorio. Sin WebGL ni degradación.
3. **Servidor Autoritativo:** El cliente nunca decide la física económica ni inventarios.
4. **Economía Física:** Cero teletransporte. Bienes materiales y trueque en etapas I–IV.
5. **Persistencia 24/7:** Simulación offline calculada por el servidor al reconectar.

---

## 3. Estado de Fases
| Fase | Nombre | Total Tickets | Completados | Estado |
| :---: | :--- | :---: | :---: | :---: |
| **0** | **PREPRODUCCIÓN** | 8 | 1 | 🟡 EN PROGRESO (T02 activo) |
| 1 | VIABILIDAD DEL MUNDO 3D | 12 | 0 | ⚪ PENDIENTE |
| 2 | VERTICAL SLICE URBANO | 7 | 0 | ⚪ PENDIENTE |
| 3 | DOMINIO ECONÓMICO | 10 | 0 | ⚪ PENDIENTE |
| 4 | MULTIJUGADOR, ROLES Y POLÍTICA | 7 | 0 | ⚪ PENDIENTE |
| 5 | ESTRATEGIA Y CONFLICTO | 5 | 0 | ⚪ PENDIENTE |
| 6 | PLANETA DINÁMICO Y ESCALA | 4 | 0 | ⚪ PENDIENTE |
| 7 | ESPACIO E INTERESTELAR | 4 | 0 | ⚪ PENDIENTE |
| 8 | PRODUCCIÓN, PULIDO Y LANZAMIENTO | 7 | 0 | ⚪ PENDIENTE |
| **Total** | **Ciclo Completo** | **64** | **1** | — |

---

## 4. Próximos Pasos Inmediatos
1. Ejecutar **T02 — Producto mínimo, vertical slice y presupuesto de riesgos** (`docs/MILESTONES.md`, `docs/PRODUCT_METRICS.md`).
2. Pasar de forma autónoma a **T03 — Repositorio, entorno reproducible y convenciones de código** (Scaffolding monorepo pnpm, TypeScript estricto, Babylon WebGPU, Node/ws).
