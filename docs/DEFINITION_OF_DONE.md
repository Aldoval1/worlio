# Definición de Terminado (Definition of Done — DoD) e Invariantes

**Archivo:** `docs/DEFINITION_OF_DONE.md`  
**Edición:** Octubre 2026

---

## 1. Matriz de Invariantes Innegociables

Ningún ticket puede declararse terminado si viola cualquiera de estos 12 invariantes:

| Invariante                           | Regla Obligatoria                                                                              | Prueba Mínima Exigida                                               | Fallo Crítico que Bloquea el Ticket                                 |
| :----------------------------------- | :--------------------------------------------------------------------------------------------- | :------------------------------------------------------------------ | :------------------------------------------------------------------ |
| **1. Un Universo; Múltiples Vistas** | Mismo `planetId`, `regionId` y `cityId` visible en órbita, región y suelo.                     | Observar misma entidad al alternar zoom de órbita a 2m.             | Teletransporte de ciudad o regeneración de mundo al hacer zoom.     |
| **2. Generación Determinista**       | La misma tupla `(seed, generatorVersion, coords)` produce exactamente la misma altura y bioma. | Muestreo idéntico en pruebas unitarias de 3 seeds distintas.        | Geografía o costa cambia al recargar o variar el LOD.               |
| **3. Coordenada y Precisión**        | Coordenadas en metros right-handed, CPU Float64, GPU local/anclada.                            | Recorrido de 12 puntos cardinales a 2 m del suelo sin temblor.      | Jitter visual visible, cámara que atraviesa el relieve.             |
| **4. WebGPU Exclusivo**              | Motor Babylon.js `WebGPUEngine` exclusivamente.                                                | Inicialización probada y pantalla de fallback explicativa.          | Fallback no autorizado a WebGL o pantalla blanca sin mensaje.       |
| **5. Almacén Físico y Titularidad**  | Todo bien pertenece a un lote físico en un edificio; no saldo global gastable.                 | Intentar gastar sin lote local en destino (debe ser rechazado).     | Saldo global mágico o inventario negativo (`available < 0`).        |
| **6. Transacción Atómica**           | `available = onHand - reserved >= 0`; reserva y consumo atómicos e idempotentes.               | 100 solicitudes concurrentes y simulación de caída de red.          | Duplicación de recursos o pérdidas no registradas en ledger.        |
| **7. Persistencia Offline**          | El mundo avanza según reloj del servidor y sobrevive a reinicios.                              | Reiniciar servidor en medio de un viaje o construcción.             | Doble entrega de lote o reseteo de temporizadores al reiniciar.     |
| **8. Política Ejecutable**           | Leyes, cargos y constituciones validadas autoritativamente en servidor.                        | Usuario no autorizado intenta ordenar obra o gasto (rechazo 403).   | Bypass de permisos constitucionales o anulación de secesión.        |
| **9. Interés por Zona (AOI)**        | Servidor solo envía al cliente las entidades de su rango de observación.                       | Inspección de paquetes WS: no filtrar posiciones militares ocultas. | Cliente recibe posiciones enemigas bajo niebla de guerra.           |
| **10. Handoff de Zona Único**        | Una entidad tiene un único propietario de escritura en cada instante.                          | Concurrencia en frontera de dos zonas de servidor.                  | Dos procesos escribiendo sobre el mismo envío o pérdida de entidad. |
| **11. Rendimiento Medido**           | Toda afirmación de velocidad debe acompañarse de telemetría y percentiles.                     | Registro de mediana y p95 de intervalos de frame y ticks.           | Afirmar 60 FPS basándose en un único frame bajo VSync.              |
| **12. Responsabilidad Legal**        | Todo archivo y activo tiene origen, licencia y derecho de uso auditado.                        | Verificación contra catálogo de licencias (`ASSET_LICENSES.md`).    | Publicación de texturas o modelos comerciales sin derecho de autor. |

---

## 2. Checklist Estándar de Cierre de Ticket

Para dar por cerrado un ticket `Txx`, el informe final debe constatar:

- [ ] **Código y Arquitectura:** Implementado dentro del alcance estricto, sin tocar módulos no autorizados.
- [ ] **Tipado y Compilación:** `pnpm check` (tsc strict sin errores), `pnpm lint` limpio, `pnpm format:check` verificado.
- [ ] **Suites de Pruebas:** `pnpm test` pasando al 100% (cero fallos, cero regresiones).
- [ ] **Construcción:** `pnpm build` finalizado con éxito para todos los paquetes involucrados.
- [ ] **Evidencia Registrada:** Archivo `docs/evidence/Txx.md` con salida real de comandos, hardware observado y límites.
- [ ] **Commit Local:** Commit en Git con mensaje estructurado `feat(Txx): ...` o `docs(Txx): ...` con hash verificable.
- [ ] **Actualización de Documentación:** Estados actualizados en `docs/PROJECT_STATE.md` y `docs/BACKLOG.md`.
- [ ] **Siguiente Paso:** Identificación inmediata del siguiente ticket desbloqueado.
