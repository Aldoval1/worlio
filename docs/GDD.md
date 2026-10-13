# Game Design Document (GDD) — Universo RTS
**Archivo:** `docs/GDD.md`  
**Versión:** 1.0 Maestro  
**Estado:** [C] CONFIRMADO

---

## 1. Bucles de Juego y Experiencia del Jugador
### Bucle de Minutos (Táctico & Operativo):
- Inspeccionar un distrito o colonia en 3D.
- Analizar indicadores de suministro y demandas de almacenes locales.
- Trazar un tramo de carretera o asignar una nueva zona residencial/industrial.
- Resolver un cuello de botella logístico o aprobar un pedido de obra.
- Observar el movimiento de un convoy o destacamento y confirmar órdenes.

### Bucle de Horas (Estratégico & Municipal):
- Aumentar las existencias físicas de reserva en almacenes clave.
- Abrir un mercado de trueque o negociar un contrato recurrente de intercambio con una ciudad vecina.
- Despachar envíos de largo alcance entre municipios.
- Asignar capacidad de academias/laboratorios a la investigación de la era.
- Reagrupar compañías militares y organizar líneas defensivas en fronteras.

### Bucle de Días / Semanas (Macroestratégico & Civilización):
- Gobernar una región o civilización soberana con múltiples ciudades.
- Mantener la cobertura y capacidad de servicios urbanos ante el crecimiento demográfico.
- Ejercer diplomacia: pactar tratados de no agresión, defensa mutua o embargos.
- Ejercer el derecho de secesión para fundar una nueva nación soberana.
- Colonizar nuevos territorios vírgenes del planeta o preparar una expedición interestelar.

---

## 2. Flujo de la Primera Sesión y Divulgación Progresiva (Progressive Disclosure)
1. **Llegada:** El nuevo jugador entra por invitación o funda una aldea inicial en un planeta compartido.
2. **Localización:** Vista orbital que desciende suavemente hacia el asentamiento asignado.
3. **Tutorial de Cámara y Terreno:** Controles fluidos de órbita, paneo y zoom con la rueda del ratón.
4. **Identificación de Inventarios:** Visualización de un almacén físico con reservas de madera y piedra (sin saldos globales mágicos).
5. **Primera Infraestructura:** Trazado de un camino de tierra entre el almacén y una cantera de piedra.
6. **Construcción y Logística:** Ordenar un taller de herramientas; observar cómo una carreta recoge madera, recorre el camino y la entrega físicamente antes de que comience la obra.
7. **Notificaciones y Cierre:** Consulta de órdenes en curso y desconexión con la certeza de que el servidor mantendrá la simulación activa 24/7.
- *Nota de Progressive Disclosure:* La interfaz solo muestra controles relevantes para el rol y la era del jugador. Un alcalde neolítico no ve paneles de flotas interestelares ni radares atómicos.

---

## 3. Reglas Anti-Frustración
- Estados de envío y construcción siempre legibles con ETA explícito y causa visible en caso de parada (ej. "En espera de piedra", "Carretera cortada").
- Historial transparente de órdenes ejecutadas y rechazadas con motivo exacto.
- Previsualización clara de costes y consumo de materiales antes de confirmar cualquier trazado o edificio.
- Deshacer (*Undo*) permitido únicamente en herramientas de previsualización local antes de enviar la orden al servidor; una vez confirmada la orden, cualquier corrección se realiza mediante operaciones compensatorias (demolición, recuperación de escombros).

---

## 4. Jerarquía Territorial y Roles
| Nivel Territorial | Rol Principal | Competencias Exclusivas |
| :--- | :--- | :--- |
| **Ciudad / Municipio** | Alcalde | Trazado vial, zonificación urbana, almacenes públicos, aprobación de reclutamiento local, secesión unilateral. |
| **Región** | Gobernador Regional | Infraestructuras interurbanas (puentes mayores, puertos regionales), coordinación logística regional. |
| **Nación / Civilización** | Rey / Canciller / Fundador | Agenda nacional de investigación científica, tratados de paz, diplomacia exterior, embargos. |
| **Fuerzas Armadas** | General / Almirante | Diseño de plantillas militares, solicitud de tropas/suministros al alcalde, órdenes de frentes y ofensivas. |
| **Colonia / Espacio** | Gobernador Colonial | Administración de asentamientos en mundos hostiles, soporte vital, comercio interestelar. |
