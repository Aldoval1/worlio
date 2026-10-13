# Backlog Integral y Rastreable — Universo RTS (T01–T64)

**Archivo:** `docs/BACKLOG.md`  
**Convención de Estimación:** Bandas de complejidad (S: 1–2 ciclos, M: 3–5 ciclos, L: 6–10 ciclos, XL: 10+ ciclos), sin promesas de fechas fijas.

---

## Resumen de Fases y Puertas de Avance

| Fase       | Nombre                           |  Rango  | Puerta de Aceptación Medible                                                   |
| :--------- | :------------------------------- | :-----: | :----------------------------------------------------------------------------- |
| **Fase 0** | Preproducción                    | T01–T08 | GDD, CI, hardware objetivo, tokens y estilo formalizados                       |
| **Fase 1** | Viabilidad del Mundo 3D          | T09–T20 | Planeta 250 km visible órbita $\rightarrow$ suelo (2 m) sin jitter ni costuras |
| **Fase 2** | Vertical Slice Urbano            | T21–T27 | Carretera, zona, obra, almacén y convoy completan ciclo físico                 |
| **Fase 3** | Dominio Económico                | T28–T37 | Inventarios atómicos sin duplicación, rutas multimodales y persistencia SQLite |
| **Fase 4** | Multijugador, Roles y Política   | T38–T44 | Dos clientes WebSocket, constituciones ejecutables y secesión unilateral       |
| **Fase 5** | Estrategia y Conflicto           | T45–T49 | Plantillas militares, frentes, suministros físicos, ocupación y paz            |
| **Fase 6** | Planeta Dinámico y Escala        | T50–T53 | Niebla de guerra en servidor, clima, handoff y 100 clientes sintéticos         |
| **Fase 7** | Espacio e Interestelar           | T54–T57 | Sistemas estelares, naves, colonias y créditos universales tardíos             |
| **Fase 8** | Producción, Pulido y Lanzamiento | T58–T64 | Presupuesto 60 FPS, licencias auditadas, alpha cerrada y operación continua    |

---

## FASE 0 · PREPRODUCCIÓN

- [x] **T01 — Visión, restricciones, referentes y GDD verificable**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ A0 | _Estado:_ IN_PROGRESS
  - _Criterio:_ Documentos de visión, GDD, 10 historias de usuario, perfiles de hardware y mapa de eras creados sin omisiones de reglas [C].
- [ ] **T02 — Producto mínimo, vertical slice y presupuesto de riesgos**
  - _Prioridad:_ P0 | _Banda:_ S | _Dependencia:_ T01 | _Estado:_ PENDING
  - _Criterio:_ Definición de alcance del vertical slice (P0/P1), métricas de observabilidad y plan de recorte de riesgos.
- [ ] **T03 — Repositorio, entorno reproducible y convenciones de código**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T02 | _Estado:_ PENDING
  - _Criterio:_ Monorepo pnpm + TypeScript estricto, scripts raíz unificados (`dev`, `check`, `lint`, `test`, `build`), lockfile limpio.
- [ ] **T04 — CI, pruebas base y disciplina ADR**
  - _Prioridad:_ P0 | _Banda:_ S | _Dependencia:_ T03 | _Estado:_ PENDING
  - _Criterio:_ Vitest, ESLint, Prettier y GitHub Actions configurados; prueba de fallo forzado que bloquea CI.
- [ ] **T05 — Diseño técnico y contratos de dominio estables**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T01, T03 | _Estado:_ PENDING
  - _Criterio:_ IDs estables, coordenadas en metros, esquemas runtime de comandos/eventos y pruebas de serialización roundtrip.
- [ ] **T06 — Observabilidad, hardware y escena de diagnóstico**
  - _Prioridad:_ P0 | _Banda:_ S | _Dependencia:_ T03, T04 | _Estado:_ PENDING
  - _Criterio:_ Instrumentación de draw calls, FPS percentiles (p50/p95), memoria de buffers y telemetría de ticks.
- [ ] **T07 — Dirección artística y pipeline de activos con licencias**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T01, T02 | _Estado:_ PENDING
  - _Criterio:_ Art bible con reglas GLB, metros, LODs 0–3, paletas y registro de licencias de assets sin infracciones.
- [ ] **T08 — Arquitectura UX, wireframes y pruebas de tarea**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T01, T07 | _Estado:_ PENDING
  - _Criterio:_ Tokens de diseño, wireframes de 4 escalas, panel contextual y prototipo de selección accesible.

---

## FASE 1 · VIABILIDAD DEL MUNDO 3D

- [x] **T09 — WebGPU exclusivo: motor, error compatible y primera escena**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T03, T04 | _Estado:_ DONE
  - _Criterio:_ Babylon.js WebGPUEngine inicializado asíncronamente; fallback visual de incompatibilidad probado; render loop right-handed.
- [x] **T10 — Thin Instances, instancing y benchmark 1.000/10.000**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T09, T06 | _Estado:_ DONE
  - _Criterio:_ 1.000 y 10.000 edificios instanciados en GPU; medición de draw calls, VRAM y picking parcial probado.
- [x] **T11 — Generador de planeta por seeds y versión**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T05, T09 | _Estado:_ DONE
  - _Criterio:_ `PlanetDefinition`, ruido continuo 3D multioctava en dirección esférica; `sampleTerrain` determinista entre plataformas.
- [x] **T12 — Cube-sphere, océanos y escena orbital procedural**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T11, T09 | _Estado:_ DONE
  - _Criterio:_ 6 caras proyectadas radialmente; océanos opacos al nivel del mar sin z-fighting; 3 seeds distinguidas como esferas sólidas.
- [x] **T13 — Precisión global, ancla local y floating origin**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T11, T12 | _Estado:_ DONE
  - _Criterio:_ CPU en double precision (`number`), GPU con anclas locales de tile; eliminación total de jitter al viajar 125 km.
- [ ] **T14 — Topología de chunks, teselas y vecinos de seis caras**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T12, T13 | _Estado:_ PENDING
  - _Criterio:_ Quadtree por cara, grid diádica $33\times 33$; muestreo unificado en límites intercara sin agujeros ni grietas.
- [ ] **T15 — LOD dinámico, malla cosida y presupuestos**
  - _Prioridad:_ P0 | _Banda:_ XL | _Dependencia:_ T14, T13, T06 | _Estado:_ PENDING
  - _Criterio:_ Refinamiento por error proyectado, histéresis, unión cosida (stitching), sustitución atómica padre $\rightarrow$ hijos.
- [ ] **T16 — Cámara Cesium-feel con picking de región y zoom por altura**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T12, T13 | _Estado:_ PENDING
  - _Criterio:_ Zoom proporcional a altitud libre, anclaje geográfico al cursor, sin gimbal lock ni roll descontrolado.
- [ ] **T17 — Transición orbital-regional y horizonte físico**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T15, T16 | _Estado:_ PENDING
  - _Criterio:_ Coordinador único con cuaterniones; el planeta pasa de esfera a horizonte terrestre sin saltos de escena.
- [ ] **T18 — Navegación al suelo y colisión de cámara**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T17, T15 | _Estado:_ PENDING
  - _Criterio:_ Descenso hasta 2 m sobre el suelo real; cámara collision contra terreno visible sin atravesar montañas.
- [ ] **T19 — Biomas, materialidad y normal visual a todas las escalas**
  - _Prioridad:_ P1 | _Banda:_ M | _Dependencia:_ T15, T18, T07 | _Estado:_ PENDING
  - _Criterio:_ Biomas por latitud, humedad y altura; materiales PBR sobrios; bosque/monte reconocible desde órbita y suelo.
- [ ] **T20 — Persistencia de ediciones de relieve, carreteras y agotamiento**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T18, T05 | _Estado:_ PENDING
  - _Criterio:_ Deltas versionados por tile en SQLite; excavaciones y caminos sobreviven a recarga de navegador.

---

## FASE 2 · VERTICAL SLICE URBANO

- [ ] **T21 — Editor de carreteras curvas y conectividad vial**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T18, T20 | _Estado:_ PENDING
  - _Criterio:_ Splines proyectadas sobre terreno; grafo determinista de nodos/aristas guardado en servidor.
- [ ] **T22 — Zonificación, parcelas y edificación privada automatizada**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T21, T07 | _Estado:_ PENDING
  - _Criterio:_ Parcelas R/C/I; algoritmo privado construye edificios si hay carreteras, mano de obra y materiales.
- [ ] **T23 — Construcción estratégica, fases de obra y reparación**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T22, T28 | _Estado:_ PENDING
  - _Criterio:_ Estados planificado $\rightarrow$ obra $\rightarrow$ operativo; requiere llegada física de materiales y trabajadores.
- [ ] **T24 — Población por cohortes, empleo y vivienda**
  - _Prioridad:_ P1 | _Banda:_ M | _Dependencia:_ T22, T23 | _Estado:_ PENDING
  - _Criterio:_ Población agregada por cohortes de edad y empleo; consumo de agua/alimentos y cálculo de bienestar.
- [ ] **T25 — Servicios: agua, energía, salud, educación y emergencia**
  - _Prioridad:_ P1 | _Banda:_ M | _Dependencia:_ T24, T21, T29 | _Estado:_ PENDING
  - _Criterio:_ Redes por grafo; edificios sin suministro reducen productividad físicamente.
- [ ] **T26 — Herramientas de selección, órdenes y feedback visual**
  - _Prioridad:_ P0 | _Banda:_ S | _Dependencia:_ T21, T22, T08 | _Estado:_ PENDING
  - _Criterio:_ Ray picking preciso, panel contextual por rol, retroalimentación de comandos confirmados por servidor.
- [ ] **T27 — Escenario completo de ciudad vertical y tutorial**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T21–T26, T33, T38 | _Estado:_ PENDING
  - _Criterio:_ Cadena completa: extracción $\rightarrow$ almacén $\rightarrow$ convoy con ETA $\rightarrow$ obra terminada, sobreviviente a reinicio.

---

## FASE 3 · DOMINIO ECONÓMICO

- [ ] **T28 — Catálogo de recursos, unidades y depósitos locales**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T05 | _Estado:_ PENDING
  - _Criterio:_ Recursos declarados con masa/volumen; `InventoryLot` con dueño y ubicación; suma nacional no gastable directamente.
- [ ] **T29 — Reserva atómica, idempotencia y conservación de inventario**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T28, T04 | _Estado:_ PENDING
  - _Criterio:_ `available = onHand - reserved >= 0`; transacciones SQLite ACID; 100 pedidos concurrentes sin duplicación.
- [ ] **T30 — Recetas, extracción, productividad e impuestos en especie**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T29, T24 | _Estado:_ PENDING
  - _Criterio:_ Cadenas de producción por era; deducción de impuestos en especie directo a almacenes públicos reales.
- [ ] **T31 — Grafo multimodal y planificación de rutas**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T21, T29 | _Estado:_ PENDING
  - _Criterio:_ A*/Dijkstra con cálculo de tiempos, pendientes y validación de permisos territoriales de paso.
- [ ] **T32 — Asignación automática de pedidos y reservas de vehículo**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T30, T31 | _Estado:_ PENDING
  - _Criterio:_ Planificador asigna proveedor y vehículo sin microgestión manual de cada camión o carreta.
- [ ] **T33 — Envíos durables, ETA, visualización y fallos de ruta**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T32, T37 | _Estado:_ PENDING
  - _Criterio:_ Objeto `Shipment` con ETA persistente; vehículos 3D interpolados; desvío ante puente cortado probado.
- [ ] **T34 — Mercados, trueque y contratos recurrentes**
  - _Prioridad:_ P1 | _Banda:_ M | _Dependencia:_ T29, T31, T33 | _Estado:_ PENDING
  - _Criterio:_ Trueque directo A $\leftrightarrow$ B sin dinero en etapas I–IV; contratos bilaterales auditables.
- [ ] **T35 — Pruebas de estrés económico y conciliación**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T30, T33, T34 | _Estado:_ PENDING
  - _Criterio:_ 10.000 operaciones sintéticas; auditoría matemática: inicial + extracción - consumo = final + tránsito.
- [ ] **T36 — Modelo de reloj persistente, calendario y colas offline**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T05, T30 | _Estado:_ PENDING
  - _Criterio:_ Event queue con deadlines UTC; avance offline ordenado al reiniciar servidor.
- [ ] **T37 — Persistencia SQLite, snapshots, eventos y restauración**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T29, T36 | _Estado:_ PENDING
  - _Criterio:_ Snapshot + replay de eventos; recuperación íntegra tras fallo simulado con RTO medido.

---

## FASE 4 · MULTIJUGADOR, ROLES Y POLÍTICA

- [ ] **T38 — Servidor WebSocket autoritativo y mundo compartido mínimo**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T05, T36 | _Estado:_ PENDING
  - _Criterio:_ 2 navegadores en distintas escalas ven la misma ciudad y cambios sincronizados en tiempo real.
- [ ] **T39 — Interest management, snapshots y recuperación de huecos**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T38, T13 | _Estado:_ PENDING
  - _Criterio:_ Suscripción por AOI de cámara; recuperación de paquetes perdidos vía `REQUEST_SYNC`.
- [ ] **T40 — Identidad, sesiones, permisos y membresía de civilización**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T38, T05 | _Estado:_ PENDING
  - _Criterio:_ Roles validados en servidor (alcalde, general, rey); observador no puede ordenar gasto o construcción.
- [ ] **T41 — Constituciones ejecutables, nombramientos y votaciones**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T40 | _Estado:_ PENDING
  - _Criterio:_ Motor de evaluación de políticas; elecciones y reformas legales que alteran comandos permitidos.
- [ ] **T42 — Secesión, unanimidad y transferencia de soberanía**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T41, T37 | _Estado:_ PENDING
  - _Criterio:_ Secesión unilateral municipal ejecutada; retención in situ de estructuras y existencias sin duplicar.
- [ ] **T43 — Diplomacia, tratados, embargos y tensión planetaria**
  - _Prioridad:_ P1 | _Banda:_ M | _Dependencia:_ T41, T34 | _Estado:_ PENDING
  - _Criterio:_ Tratados bilaterales firmados; reparación material ejecutada mediante envíos físicos.
- [ ] **T44 — Investigación, laboratorios y progreso global de eras**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T30, T36, T41 | _Estado:_ PENDING
  - _Criterio:_ Árbol tecnológico DAG; cálculo de umbrales planetarios (80% Neolítico, 75% Baja Edad Media).

---

## FASE 5 · ESTRATEGIA Y CONFLICTO

- [ ] **T45 — Plantillas militares, pedidos y entrenamiento**
  - _Prioridad:_ P1 | _Banda:_ M | _Dependencia:_ T40, T29, T33 | _Estado:_ PENDING
  - _Criterio:_ Reclutamiento condicionado a suministros físicos autorizados por el alcalde competente.
- [ ] **T46 — Movimiento de ejércitos, frentes y abastecimiento**
  - _Prioridad:_ P1 | _Banda:_ L | _Dependencia:_ T45, T31 | _Estado:_ PENDING
  - _Criterio:_ Líneas de frente inspiradas en HoI4; desgaste y reducción de organización si se corta la logística.
- [ ] **T47 — Resolución de combate, daños y ocupación urbana**
  - _Prioridad:_ P1 | _Banda:_ L | _Dependencia:_ T46, T23 | _Estado:_ PENDING
  - _Criterio:_ King-of-the-Hill urbano; ocupación militar transitoria diferenciada de anexión formal.
- [ ] **T48 — Paz, tratados de cesión y reparaciones materiales**
  - _Prioridad:_ P1 | _Banda:_ M | _Dependencia:_ T47, T43 | _Estado:_ PENDING
  - _Criterio:_ Cesión territorial y transferencia física de bienes estipulada en tratados de paz libres.
- [ ] **T49 — Flotas marítimas, aéreas y soporte logístico**
  - _Prioridad:_ P2 | _Banda:_ L | _Dependencia:_ T46, T43 | _Estado:_ PENDING
  - _Criterio:_ Puertos, aeronaves con bases de repostaje y convoyes marítimos con el mismo inventario físico.

---

## FASE 6 · PLANETA DINÁMICO Y ESCALA

- [ ] **T50 — Niebla de guerra, prospección y conocimiento persistente**
  - _Prioridad:_ P1 | _Banda:_ M | _Dependencia:_ T19, T40 | _Estado:_ PENDING
  - _Criterio:_ Servidor filtra mensajes y entidades enemigas fuera de rango de visión; prospecciones mineras durables.
- [ ] **T51 — Clima, estaciones, contaminación y desastres**
  - _Prioridad:_ P2 | _Banda:_ M | _Dependencia:_ T19, T25, T36 | _Estado:_ PENDING
  - _Criterio:_ Eventos probabilísticos deterministas (tormentas, sequías) con impacto físico en logística y producción.
- [ ] **T52 — Zonas autoritativas, handoff y balance de carga**
  - _Prioridad:_ P1 | _Banda:_ L | _Dependencia:_ T39, T37, T33 | _Estado:_ PENDING
  - _Criterio:_ Handoff en 4 fases (preparar, bloquear, confirmar, activar) de entidades entre zonas sin doble dueño.
- [ ] **T53 — Prueba de 100 clientes sintéticos y degradación controlada**
  - _Prioridad:_ P1 | _Banda:_ L | _Dependencia:_ T39, T52, T35 | _Estado:_ PENDING
  - _Criterio:_ 100 bots interactuando $>30$ min; medición de latencia p95, tick y estabilidad de memoria.

---

## FASE 7 · ESPACIO E INTERESTELAR

- [ ] **T54 — Generación de estrellas, sistemas y exploración espacial**
  - _Prioridad:_ P2 | _Banda:_ L | _Dependencia:_ T50, T44, T52 | _Estado:_ PENDING
  - _Criterio:_ Sistemas estelares procedurales cargados por interés; mapa galáctico con identidad de objetos coherente.
- [ ] **T55 — Astilleros, naves, viajes y comercio interestelar**
  - _Prioridad:_ P2 | _Banda:_ L | _Dependencia:_ T54, T33, T46 | _Estado:_ PENDING
  - _Criterio:_ Naves construidas con tiempo y materiales; transporte interestelar sin teletransporte.
- [ ] **T56 — Colonias planetarias, soporte vital y autonomía política**
  - _Prioridad:_ P2 | _Banda:_ L | _Dependencia:_ T55, T42, T25 | _Estado:_ PENDING
  - _Criterio:_ Expedición funda colonia con centro de mando y soporte vital; derecho de secesión colonial activo.
- [ ] **T57 — Progresión tardía, créditos universales y balance interestelar**
  - _Prioridad:_ P2 | _Banda:_ M | _Dependencia:_ T55, T56, T34 | _Estado:_ PENDING
  - _Criterio:_ Activación de créditos universales en etapa V con libro mayor auditable sin alterar economía física previa.

---

## FASE 8 · PRODUCCIÓN, PULIDO Y LANZAMIENTO

- [ ] **T58 — Optimización cliente, streaming y experiencia fluida**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T18, T27, T53 | _Estado:_ PENDING
  - _Criterio:_ Cumplimiento de frame budget de 16.6 ms (60 FPS p95 en PC objetivo) y streaming sin bloqueos de render.
- [ ] **T59 — Arte final, animación, audio, efectos y accesibilidad**
  - _Prioridad:_ P1 | _Banda:_ L | _Dependencia:_ T07, T08, T58 | _Estado:_ PENDING
  - _Criterio:_ Modelos GLB optimizados por era, SFX coherentes, soporte de alto contraste y movimiento reducido.
- [ ] **T60 — QA integral, seguridad, antitrampa y moderación**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T27, T53, T59 | _Estado:_ PENDING
  - _Criterio:_ Cero vulnerabilidades críticas; protección contra inyecciones, manipulación de paquetes y multicuenta abusiva.
- [ ] **T61 — Cumplimiento legal, privacidad, licencias y términos**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T59, T60 | _Estado:_ PENDING
  - _Criterio:_ Auditoría completa de licencias de assets y código; términos de servicio y políticas de privacidad conformes.
- [ ] **T62 — Alpha cerrada, telemetría de diversión y economía de operación**
  - _Prioridad:_ P0 | _Banda:_ M | _Dependencia:_ T60, T61 | _Estado:_ PENDING
  - _Criterio:_ Playtesting con testers reales; medición de retención y tiempo hasta primer envío sin corrupción.
- [ ] **T63 — Beta, hardening, despliegue y plan de recuperación**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T62, T52 | _Estado:_ PENDING
  - _Criterio:_ Staging/producción segregados; simulacro de disaster recovery probado con restauración verificada.
- [ ] **T64 — Lanzamiento, comunidad y operación continua**
  - _Prioridad:_ P0 | _Banda:_ L | _Dependencia:_ T63 | _Estado:_ PENDING
  - _Criterio:_ Servidores en vivo con telemetría 24/7, runbooks de soporte y pipeline de parches versionados.
