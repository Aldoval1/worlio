# Registro de Decisiones de Arquitectura (ADR) — Universo RTS
**Archivo:** `docs/DECISIONS.md`  
**Estándar:** Contexto, Opciones, Decisión, Consecuencias, Capacidad de Reversión

---

## ADR-0001: Adopción Exclusiva de WebGPU con Babylon.js WebGPUEngine
- **Estado:** [C] CONFIRMADO
- **Fecha:** 2026-10-12
- **Contexto:** El proyecto demanda renderizado planetario masivo a gran escala (250 km de diámetro), instanciado masivo de edificios (10.000+ thin instances), frustum culling acelerado por GPU y shaders WGSL avanzados. WebGL2 presenta cuellos de botella severos en draw calls y carece de compute shaders nativos.
- **Opciones Consideradas:**
  1. Babylon.js con WebGPUEngine exclusivo.
  2. Babylon.js con fallback automático a WebGL2.
  3. Three.js con WebGPURenderer experimental.
- **Decisión:** Adoptar Babylon.js `WebGPUEngine` de forma **exclusiva**, sin fallback ni soporte para WebGL. Si el navegador no soporta WebGPU, se muestra una interfaz elegante explicando los requisitos y cómo activar la aceleración gráfica.
- **Consecuencias:** Se eliminan bifurcaciones complejas en shaders y código de render; se aprovecha la potencia completa de la GPU moderna. Los usuarios en navegadores obsoletos no podrán ejecutar el cliente 3D.
- **Reversibilidad:** Baja. El código de shaders y pipelines estará optimizado para WGSL/WebGPU.

---

## ADR-0002: Arquitectura Monorepo pnpm con TypeScript Estricto
- **Estado:** [C] CONFIRMADO
- **Fecha:** 2026-10-12
- **Contexto:** El cliente 3D y el servidor deben compartir definiciones de tipos, esquemas de validación, fórmulas matemáticas deterministas y generadores procedurales sin duplicar código ni publicar paquetes en npm público.
- **Opciones Consideradas:**
  1. Monorepo pnpm (`apps/client`, `apps/server`, `packages/shared`, `packages/worldgen`, `packages/domain`).
  2. Repositorios separados cliente y servidor.
  3. Monorepo npm / yarn clásico.
- **Decisión:** Monorepo pnpm con TypeScript estricto (`strict: true`). Workspace local con symlinks eficientes y aislamiento estricto de dependencias.
- **Consecuencias:** Compartición instantánea de contratos en tiempo de compilación; compilaciones rápidas y deduplicación en disco. Requiere `pnpm` en entorno de desarrollo y CI.
- **Reversibilidad:** Alta (los paquetes son carpetas modulares estándar).

---

## ADR-0003: Servidor Autoritativo Estricto y Protocolo WebSocket Versionado
- **Estado:** [C] CONFIRMADO
- **Fecha:** 2026-10-12
- **Contexto:** En un MMO-RTS persistente, los clientes no pueden tener autoridad sobre los inventarios, la posición de ejércitos o la finalización de obras para prevenir trampas y desincronización.
- **Opciones Consideradas:**
  1. Servidor autoritativo con WebSocket binario/JSON tipado.
  2. Peer-to-peer con lockstep determinista.
  3. API REST / polling HTTP tradicional.
- **Decisión:** Servidor autoritativo en Node/TypeScript comunicándose vía WebSocket. El cliente emite comandos de intención (`Command`); el servidor valida permisos, recursos y topología, y emite eventos autoritativos (`Event`) y snapshots periódicos.
- **Consecuencias:** Prevención total de trampas de inventario y teletransporte; latencia controlada. Mayor carga computacional en el servidor, mitigada por simulación por eventos y ticks discretos.
- **Reversibilidad:** Media.

---

## ADR-0004: Coordenadas Right-Handed, Y-Up en Metros y Floating Origin
- **Estado:** [C] CONFIRMADO
- **Fecha:** 2026-10-12
- **Contexto:** Un planeta de 250 km de diámetro (radio 125.000 m) genera pérdida de precisión si se utilizan coordenadas Float32 directamente en GPU al nivel del suelo (jitter visible de milímetros a centímetros).
- **Opciones Consideradas:**
  1. Doble precisión (`Float64` / `number`) en CPU y origen flotante (`Floating Origin` / ancla local de tile) en GPU.
  2. Coordenadas globales directamente en Float32 (inviable por jitter).
  3. Segmentar el planeta en mapas planos aislados con pantallas de carga (viola la North Star).
- **Decisión:** Convención right-handed, Y-up, metros. CPU calcula en IEEE-754 double precision (`number`). Cada tile planetario y objeto calcula su geometría relativa a un ancla local `A`, y la GPU renderiza respecto al origen de render `O` cercano a la cámara: $v_{\text{local}} = P - A$, $\text{worldTranslation} = A - O$.
- **Consecuencias:** Continuidad visual perfecta desde órbita hasta el suelo a 2 m sin temblor de cámara.
- **Reversibilidad:** Muy baja (pilar fundacional del motor).

---

## ADR-0005: Economía Física Material y Cero Teletransporte
- **Estado:** [C] CONFIRMADO
- **Fecha:** 2026-10-12
- **Contexto:** Los RTS tradicionales tratan los recursos como variables numéricas mágicas en la interfaz. Universo RTS busca que la logística y las líneas de suministro sean el centro de la estrategia militar y urbana.
- **Opciones Consideradas:**
  1. Recursos físicamente localizados en almacenes y lotes, con masa, volumen y traslados con ETA.
  2. Saldo nacional global instantáneo (rechazado por GDD).
- **Decisión:** Todo recurso pertenece a un `InventoryLot` con ubicación, dueño y estado. La ecuación `available = onHand - reserved >= 0` es un invariante sagrado. Todo traslado genera un `Shipment` que viaja a velocidad real. No existe dinero en etapas I–IV; solo trueque material directo e impuestos en especie.
- **Consecuencias:** Jugabilidad profunda y emergente; bloqueos de carreteras y frentes de suministro tienen impacto real. Requiere algoritmos de reparto y planificación de rutas eficientes.
- **Reversibilidad:** Nula (núcleo del juego).

---

## ADR-0006: Persistencia Híbrida Snapshot + Event Log con SQLite WAL
- **Estado:** [A] ACEPTADO
- **Fecha:** 2026-10-12
- **Contexto:** El mundo debe sobrevivir a caídas y reinicios sin perder progreso ni duplicar mercancías.
- **Opciones Consideradas:**
  1. SQLite local con WAL (Write-Ahead Logging) y transacciones ACID para prototipo y vertical slice.
  2. PostgreSQL administrado desde el día 1 (añade costo y fricción innecesaria en preproducción).
  3. Archivos JSON en disco (sin garantías ACID ni concurrencia).
- **Decisión:** SQLite con modo WAL para prototipo y desarrollo inicial, diseñando la capa de persistencia (`/storage`) para una migración limpia a PostgreSQL en Fase 6 cuando se justifique por escala.
- **Consecuencias:** Configuración cero, velocidad extrema en local y Railway, garantías de integridad transaccional completas.
- **Reversibilidad:** Alta (abstracción de repositorio en capa de aplicación).

---

## ADR-0007: Derecho Inmutable a la Secesión Municipal Unilateral
- **Estado:** [C] CONFIRMADO
- **Fecha:** 2026-10-12
- **Contexto:** Evitar que jugadores tiránicos o reyes ausentes bloqueen indefinidamente el progreso de los municipios gestionados por alcaldes activos.
- **Opciones Consideradas:**
  1. Alcalde puede independizar su ciudad unilateralmente en cualquier momento.
  2. La secesión requiere votación o aprobación de la autoridad superior (rechazada).
- **Decisión:** El alcalde municipal tiene la potestad de declarar la secesión unilateral de su ciudad de forma instantánea. La nueva nación conserva los edificios, almacenes y población locales físicamente presentes.
- **Consecuencias:** Fomenta la diplomacia activa y el buen gobierno; impide el secuestro de partidas por líderes inactivos.
- **Reversibilidad:** Nula (regla política fundamental).
