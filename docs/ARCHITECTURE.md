# Arquitectura Técnica de Referencia — Universo RTS

**Archivo:** `docs/ARCHITECTURE.md`  
**Edición:** Octubre 2026

---

## 1. Visión General: Monolito Modular con Autoridad Estricta

La arquitectura de **Universo RTS** está diseñada como un monolito modular con separación limpia de dominios. El cliente es una capa de visualización e interacción sin autoridad económica, mientras que el servidor es la fuente única de verdad para la simulación persistente.

```
                    ┌───────────────────────────────────────────────┐
                    │               CLIENTE (WebGPU)                │
                    │  Babylon.js WebGPUEngine  •  UI / HUD React   │
                    │  Cámara Multiescala  •  LOD  •  Thin Instances│
                    └───────────────────────┬───────────────────────┘
                                            │ WebSocket (JSON / Tipado)
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │             SERVIDOR AUTORITATIVO             │
                    │  ┌──────────────────┐  ┌───────────────────┐  │
                    │  │   /application   │  │      /infra       │  │
                    │  │ Comandos / Idemp.│  │   WS / Red / AOI  │  │
                    │  └─────────┬────────┘  └─────────┬─────────┘  │
                    │            │                     │            │
                    │            ▼                     ▼            │
                    │  ┌──────────────────┐  ┌───────────────────┐  │
                    │  │     /domain      │  │    /persistence   │  │
                    │  │ Economía, Rutas, │  │   SQLite (WAL)    │  │
                    │  │ Ejército, Ciudad │  │ Snapshots+Eventos │  │
                    │  └──────────────────┘  └───────────────────┘  │
                    └───────────────────────────────────────────────┘
                                            │
                        ┌───────────────────┴───────────────────┐
                        ▼                                       ▼
            ┌──────────────────────┐                ┌──────────────────────┐
            │   packages/shared    │                │  packages/worldgen   │
            │ Contratos versionados│                │ Ruido 3D, CubeSphere │
            │ Esquemas y tipos DTO │                │ sampleTerrain puro   │
            └──────────────────────┘                └──────────────────────┘
```

---

## 2. Reglas de Aislamiento de Módulos

1. **`/rendering` (Cliente 3D):**
   - Responsabilidad: Inicializar Babylon.js `WebGPUEngine`, gestionar escenas, luces, materiales PBR, mallas de chunks y cámara.
   - **Regla sagrada:** JAMÁS escribe recursos autoritativos, no altera saldos de inventario ni decide si una construcción está lista.
2. **`/domain` (Lógica de Juego Pura):**
   - Responsabilidad: Entidades (`InventoryLot`, `City`, `Shipment`, `RoadGraph`, `Army`), máquinas de estado, validación de reglas.
   - **Regla sagrada:** Cero dependencias de Babylon.js, WebGPU, Canvas o DOM. Debe ejecutarse idénticamente en Node.js o workers sin interfaz.
3. **`/application` (Capa de Aplicación):**
   - Responsabilidad: Orquestar casos de uso, validar comandos con `idempotencyKey`, comprobar permisos constitucionales por rol.
4. **`/infra` & `/persistence` (Infraestructura):**
   - Responsabilidad: Servidor WebSocket, gestión de conexiones, timeouts, transacciones SQLite y snapshots de recuperación.
5. **`packages/shared` (Contratos Compartidos):**
   - Responsabilidad: Tipos TypeScript e interfaces de comandos, eventos y DTOs versionados.
6. **`packages/worldgen` (Generación de Mundo):**
   - Responsabilidad: Matemática del relieve procedural determinista, proyecciones esféricas y muestreo continuo.

---

## 3. Modelo de Coordenadas y Precisión Espacial

- **Sistema de Coordenadas:** Mano derecha (Right-handed), Y-arriba (Y-up), unidades en metros.
- **Planeta de 250 km de diámetro:** Radio base $R = 125.000\text{ m}$.
- **Superficie Matemática:**
  $$\mathbf{P} = (R + h(\text{seed}, \mathbf{d})) \cdot \mathbf{d}$$
  Donde $\mathbf{d}$ es el vector unitario sobre la esfera y $h$ es la elevación calculada por `sampleTerrain`.
- **Estrategia Floating Origin / Ancla Local:**
  - En CPU: Todas las posiciones globales se calculan en doble precisión IEEE-754 (`number` de 64 bits).
  - En GPU: Para cada tile planetario con ancla global $\mathbf{A}$ y origen de render $\mathbf{O}$ (cercano a la cámara):
    $$\mathbf{v}_{\text{local}} = \mathbf{P} - \mathbf{A}$$
    $$\mathbf{T}_{\text{world}} = \mathbf{A} - \mathbf{O}$$
  - De este modo, las matrices Float32 de WebGPU operan siempre con magnitudes pequeñas ($< 5.000\text{ m}$), anulando por completo el temblor o jitter visual a 2 m de altura.

---

## 4. Modelo Temporal Persistente

1. **Tiempo Real UTC:** Timestamp estricto en milisegundos (`ISO-8601`) para auditoría y firmas de red.
2. **Reloj de Simulación (Simulation Clock):** Ticks lógicos del servidor que procesan la cola de eventos programados (finalización de obras, llegada de convoyes). Si el servidor se apaga, al reiniciar calcula de forma determinista el tiempo transcurrido y aplica los eventos vencidos en orden cronológico.
3. **Calendario Planetario:** Estaciones, ciclos día/noche locales derivados de la rotación y traslación planetaria ficticia.
