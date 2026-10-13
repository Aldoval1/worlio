# Catálogo Maestro de Entidades y Modelos de Dominio — Universo RTS
**Archivo:** `docs/ENTITY_CATALOG.md`  
**Edición:** Octubre 2026

---

## 1. Entidades Fundacionales

### 1.1. Planeta (`Planet`)
- **ID:** `PlanetId` (ej. `planet-terra-prime`)
- **Atributos:** Semilla determinista (`seed`), versión del generador (`generatorVersion`), radio en metros ($125.000\text{ m}$), nivel del mar ($0\text{ m}$), parámetros de ruido 3D (`octaves`, `persistence`, `lacunarity`, `heightScale`).
- **Invariantes:** Radio siempre positivo; geografía inmutable para una misma tupla `(seed, version)`; toda modificación humana se almacena como deltas.

### 1.2. Zona / Tesela Planetaria (`Tile` / `Chunk`)
- **ID:** `planetId/face/level/x/y` (Quadtree de 6 caras)
- **Atributos:** Cara del cubo (`PX`, `NX`, `PY`, `NY`, `PZ`, `NZ`), nivel de subdivisión diádica ($0$ a $12$), coordenadas $(x, y)$, ancla local $\mathbf{A}$, malla de elevación ($33 \times 33$ vértices).
- **Invariantes:** Muestreo idéntico en aristas compartidas entre caras; sin grietas topológicas (*seamless stitching*).

### 1.3. Ciudad / Municipio (`City`)
- **ID:** `CityId` (ej. `city-nueva-esperanza-01`)
- **Atributos:** Nombre, civilización soberana (`FactionId`), posición geográfica de centro administrativo, cohorte de población, territorio delimitado.
- **Autoridad:** Gobernado por el `Alcalde`.
- **Invariante:** Conserva derecho inmutable de secesión unilateral.

### 1.4. Carretera / Tramo Vial (`Road`)
- **ID:** `RoadId`
- **Atributos:** Nodo inicial, nodo final, longitud en metros, pendiente máxima, capacidad de flujo, tipo de superficie (tierra, adoquinado, asfalto, ferrocarril), estado (operativa, cortada, destruida).
- **Invariantes:** La conectividad vial forma un grafo de transporte determinista; ningún vehículo puede cruzar un tramo con estado `cortada`.

### 1.5. Instalación / Edificio (`Facility` / `Building`)
- **ID:** `FacilityId`
- **Atributos:** Tipo (`ALMACEN`, `CANTERA`, `ASERRADERO`, `TALLER`, `AYUNTAMIENTO`, `CUARTEL`), era tecnológica, estado (`PLANIFICADO`, `OBRA`, `OPERATIVO`, `DANADO`, `RUINA`), coordenadas de huella física, propietario.
- **Invariante:** Requiere suministro físico entregado in situ para completar su construcción o reparación.

### 1.6. Lote de Inventario (`InventoryLot`)
- **ID:** `LotId`
- **Atributos:** Ubicación física (`FacilityId`), dueño (`FactionId`), tipo de recurso (`ResourceId`), cantidad en mano (`onHand`), cantidad reservada (`reserved`), versión de concurrencia (`version`).
- **Invariante Sagrado:**
  $$\text{available} = \text{onHand} - \text{reserved} \ge 0$$

### 1.7. Envío Logístico (`Shipment`)
- **ID:** `ShipmentId`
- **Atributos:** Instalación origen (`FacilityId`), instalación destino (`FacilityId`), lotes transportados, estado (`REQUESTED`, `RESERVED`, `LOADING`, `IN_TRANSIT`, `REROUTING`, `DELIVERED`, `LOST`, `CANCELLED`), salida UTC (`departureUtc`), llegada estimada (`arrivalEtaUtc`), clave de idempotencia (`idempotencyKey`).
- **Invariantes:** No teletransporte; acreditación en destino únicamente tras la llegada del vehículo; reintento con misma clave es idempotente.

### 1.8. Rol y Cargo Político (`PoliticalRole`)
- **Tipos:** `ALCALDE`, `GOBERNADOR_REGIONAL`, `REY_FUNDADOR`, `CANCILLER`, `GENERAL`, `ALMIRANTE`, `GOBERNADOR_COLONIAL`.
- **Invariantes:** Todo comando enviado al servidor verifica el rol activo del usuario contra la constitución vigente; usuarios sin cargo solo pueden consultar información.

### 1.9. Formación Militar / Ejército (`Army`)
- **ID:** `ArmyId`
- **Atributos:** General al mando, plantilla de composición, soldados, equipo, moral, organización, suministros físicos en reserva, posición en mapa.
- **Invariante:** Requiere suministros físicos reales para mantener su organización y capacidad de combate.

### 1.10. Tratado Diplomático (`Treaty`)
- **ID:** `TreatyId`
- **Atributos:** Facciones firmantes, tipo (paz, no agresión, defensa mutua, libre tránsito, reparaciones en especie), vigencia UTC, cláusulas ejecutables.
- **Invariante:** Las reparaciones pactadas se despachan como envíos físicos desde los almacenes del deudor.
