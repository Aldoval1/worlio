# Manual de Persistencia Planetaria y Deltas Versionados — SQLite ACID (T20)
**Módulo:** `packages/domain/src/persistence/`  
**Escala:** Persistencia local y servidor para el mundo compartido 24/7.

---

## 1. Esquema Relacional SQLite

```sql
CREATE TABLE IF NOT EXISTS tile_versions (
  tile_id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  last_modified_tick INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tile_terrain_deltas (
  tile_id TEXT NOT NULL,
  vertex_index INTEGER NOT NULL,
  height_delta REAL NOT NULL,
  biome_override TEXT,
  PRIMARY KEY (tile_id, vertex_index)
);

CREATE TABLE IF NOT EXISTS tile_roads (
  road_id TEXT PRIMARY KEY,
  tile_id TEXT NOT NULL,
  road_type TEXT NOT NULL,
  u_start REAL NOT NULL,
  v_start REAL NOT NULL,
  u_end REAL NOT NULL,
  v_end REAL NOT NULL,
  width_meters REAL NOT NULL,
  condition REAL NOT NULL,
  created_at_tick INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tile_resource_deposits (
  deposit_id TEXT PRIMARY KEY,
  tile_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  initial_reserve REAL NOT NULL,
  current_reserve REAL NOT NULL,
  depleted_amount REAL NOT NULL,
  is_depleted INTEGER NOT NULL,
  last_extracted_tick INTEGER NOT NULL
);
```

---

## 2. Invariantes de Dominio y Leyes Físicas

1. **Versionado Monotónico:**
   Cada modificación atómica de una tesela (fosa, carretera o extracción) incrementa su versión ($v \leftarrow v + 1$) dentro de la misma transacción ACID. Esto permite al cliente y a los nodos de red solicitar únicamente los deltas posteriores a su versión en caché.
2. **Conservación de Masa y No-Duplicación:**
   Ningún depósito de recursos naturales puede ser extraído por debajo de su reserva disponible ($R_{\text{current}} \ge 0$). Si $R_{\text{current}} = 0$, el depósito pasa a estado `is_depleted = true` y cualquier orden de extracción posterior es abortada con excepción inmediata.
3. **Persistencia Transaccional y Supervivencia:**
   El motor SQLite asegura durabilidad completa. Al recargar la página del navegador o reiniciar el servidor Node.js, las bases de datos exportadas reproducen exactamente el estado intervenido del relieve sobre la base procedural.
