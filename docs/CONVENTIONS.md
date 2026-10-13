# Convenciones de Nombres, Protocolo y Datos — Universo RTS

**Archivo:** `docs/CONVENTIONS.md`  
**Edición:** Octubre 2026

---

## 1. Convención de Identificadores (IDs)

Todos los IDs en el sistema deben seguir el formato `kebab-case` precedido por su categoría semántica:

- **Planetas:** `planet-{nombre}` (ej. `planet-terra-prime`)
- **Regiones:** `region-{planetId}-{x}-{y}` (ej. `region-terra-04-12`)
- **Ciudades:** `city-{nombre}-{numero}` (ej. `city-nueva-esperanza-01`)
- **Instalaciones / Almacenes:** `fac-{tipo}-{ciudadId}-{seq}` (ej. `fac-almacen-nueva-esperanza-01`)
- **Carreteras:** `road-{nodoA}-{nodoB}`
- **Lotes de Inventario:** `lot-{recursoId}-{facilityId}-{seq}` (ej. `lot-madera-almacen-01`)
- **Envíos (Shipments):** `shipment-{timestampUtc}-{hash}`
- **Facciones / Civilizaciones:** `fac-{nombre}`
- **Usuarios:** `user-{uuid}`

---

## 2. Convención Temporal y Fechas

- **Estándar Obligatorio:** Todos los timestamps en red, eventos y base de datos deben ser cadenas `ISO-8601` en tiempo universal coordinado (**UTC**):
  `YYYY-MM-DDTHH:mm:ss.sssZ` (ej. `2026-10-12T20:20:00.000Z`).
- Las comparaciones y deadlines se evalúan estrictamente contra `Date.now()` o `Date.parse()` en UTC, siendo inmunes a diferencias horarias locales (DST).

---

## 3. Catálogo de Errores Estructurados

Todos los errores devueltos por el servidor WebSocket deben respetar la estructura:

```json
{
  "type": "ERROR",
  "code": "STRING_UPPER_SNAKE_CASE",
  "message": "Descripción legible para el jugador",
  "requestId": "ID de correlación opcional"
}
```

Códigos estándar iniciales:

- `UNAUTHORIZED_ROLE`: El rol actual del usuario no tiene competencia para emitir la orden.
- `INSUFFICIENT_STOCK`: Existencias disponibles insuficientes en el lote solicitado.
- `ROAD_DISCONNECTED`: No existe trazado vial válido entre el origen y destino.
- `INVALID_PROTOCOL_VERSION`: La versión del cliente no coincide con la versión autoritativa del servidor.

---

## 4. Versionado del Protocolo

El protocolo se rige por SemVer `MAJOR.MINOR.PATCH`:

- Un cambio en `MAJOR` (ej. `1.x` a `2.x`) invalida clientes obsoletos y fuerza recarga de navegador.
- Cambios en `MINOR` o `PATCH` mantienen retrocompatibilidad de payloads.
