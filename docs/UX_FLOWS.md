# Arquitectura UX, Flujos y Pruebas de Tarea — Universo RTS
**Archivo:** `docs/UX_FLOWS.md`  
**Edición:** Octubre 2026

---

## 1. Los Cinco Flujos de Tarea Principales

### Flujo 1: Navegación Multiescala Continua (Órbita $\rightarrow$ Suelo)
1. **Entrada:** Vista orbital global del planeta esférico de 250 km.
2. **Acción:** El usuario desplaza el cursor sobre una costa o relieve y acciona la rueda del ratón hacia adelante.
3. **Comportamiento:** La cámara realiza zoom progresivo anclado al punto geográfico debajo del cursor. La velocidad de aproximación es inversamente proporcional a la distancia al suelo (desaceleración suave natural).
4. **Llegada:** La cámara se estabiliza a 2 metros del relieve con colisión física activa sin atravesar la montaña.

### Flujo 2: Trazado Vial y Conexión de Almacén
1. **Entrada:** Modo Edición / Carretera activado con tecla `R` o cinta de herramientas inferior.
2. **Acción:** Clic en almacén municipal origen y arrastre hacia el emplazamiento de una cantera.
3. **Previsualización:** La curva de spline se proyecta sobre el terreno calculando pendientes; el HUD muestra el coste de madera/piedra requerido.
4. **Confirmación:** Clic de confirmación; se envía comando `CREATE_ROAD` al servidor autoritativo.

### Flujo 3: Zonificación Urbana y Demanda
1. **Entrada:** Modo Zonificación activado con tecla `Z`.
2. **Acción:** Selección de clase (Residencial, Comercial, Industrial, Agrícola) y delimitación de cuadrícula contigua a carretera.
3. **Validación:** El servidor valida que las parcelas cuentan con acceso a carretera transitada.
4. **Crecimiento:** Si existe suministro de materiales y demanda de empleo, las empresas privadas inician la obra automáticamente.

### Flujo 4: Consulta de Almacén y Despacho de Convoy
1. **Entrada:** Clic en edificio de almacén; se despliega el panel contextual derecho.
2. **Lectura:** El jugador observa existencias: en mano (`onHand`), reservadas (`reserved`) y disponibles (`available`).
3. **Orden:** Selecciona recurso (Madera), cantidad (100) y destino (Taller en obra); presiona "Despachar Envío".
4. **Resultado:** El servidor valida que `available >= 100`, genera un `Shipment` con clave de idempotencia y despacha una carreta física con ETA.

### Flujo 5: Declaración de Secesión Municipal (Alcalde)
1. **Entrada:** Acceso al panel de gobierno y soberanía municipal (`G`).
2. **Advertencia:** Modal explicativo: "La ciudad se separará de la nación. Conservarás todos los edificios y almacenes locales. Se suspenderán los tributos y tratados vigentes."
3. **Ejecución:** Clic en "Declarar Independencia". El servidor valida que el actor es el alcalde legítimo y transfiere la titularidad soberana instantáneamente sin alterar los inventarios físicos in situ.

---

## 2. Mapa de Atajos de Teclado Remapeables
| Acción | Atajo por Defecto | Ámbito |
| :--- | :---: | :--- |
| **Alternar Órbita / Suelo** | `Espacio` | Cámara |
| **Herramienta Carretera** | `R` | Ciudad |
| **Herramienta Zonificar** | `Z` | Ciudad |
| **Menú de Construcción** | `B` | Ciudad |
| **Panel de Almacén e Inventarios** | `I` | Logística |
| **Panel de Gobierno y Constitución** | `G` | Política |
| **Centrar Vista en Capital** | `Home` | Navegación |
| **Modo Depuración / Telemetría** | `F3` | Diagnóstico |
