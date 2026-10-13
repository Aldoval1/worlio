# Hitos de Producto y Definición del Vertical Slice — Universo RTS

**Archivo:** `docs/MILESTONES.md`  
**Edición:** Octubre 2026

---

## 1. Escenario del Primer Vertical Slice (P1 Demostrable)

El primer vertical slice unificado no busca simular un imperio interestelar completo, sino demostrar de forma fehaciente el núcleo de la North Star en un escenario acotado y verificable:

- **Ubicación:** Un asentamiento municipal ("Nueva Esperanza") emplazado sobre el relieve esférico de un planeta procedural de 250 km de diámetro (radio 125.000 m).
- **Entidades Físicas Presentes:**
  - 1 Almacén Municipal Central con capacidad limitada y existencias registradas de madera y piedra.
  - 2 Cadenas de Extracción y Transformación: Bosque $\rightarrow$ Madera en troncos; Cantera $\rightarrow$ Bloques de piedra tallada.
  - 1 Red Vial Conectora: Trazado vial determinista que salva desniveles del terreno.
  - 1 Vehículo de Transporte Físico: Carreta de suministros con velocidad fija, capacidad de carga, custodia y cálculo de ETA.
  - 1 Obra en Construcción: Taller de herramientas que requiere 100 de madera y 50 de piedra para completarse.
  - 2 Clientes / Roles Conectados Simultáneamente vía WebSocket:
    1. _Alcalde:_ Planifica la obra, autoriza la reserva de materiales del almacén y despacha la orden logística.
    2. _Observador / Gestor:_ Inspecciona la ciudad desde diferente perspectiva y verifica que la entrega material se realiza antes de que el edificio pase a estado operativo.
- **Invariante Comprobado:** El taller NO progresa mientras los materiales están en viaje; cuando la carreta llega, el almacén descuenta el stock, el taller absorbe los insumos y la obra concluye. Si el servidor se apaga a mitad del viaje, al reiniciar la carreta reanuda su trayecto en la misma posición sin duplicar la carga.

---

## 2. Puertas de Alcance por Fases

| Hito                    | Alcance Incluido (In-Scope)                                                                                                                       | Lo que Explícitamente NO se hace todavía (Out-of-Scope)                                                   |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------- |
| **P0 (Viabilidad)**     | Malla orbital, instanced blocks, contratos compartidos, WebSocket eco, transacciones de inventario atómicas en SQLite.                            | No hay carreteras curvas, no hay combate, no hay IA privada, no hay múltiples planetas.                   |
| **P1 (Vertical Slice)** | Escenario de 1 ciudad, 2 cadenas, 1 carretera, 1 vehículo con ETA, obra dependiente de suministro físico, persistencia offline probada.           | No hay diplomacia entre naciones, no hay flotas navales/aéreas, no hay viajes espaciales, no hay monedas. |
| **Alpha Social**        | 2+ ciudades, roles autoritativos (alcalde, general, rey), constitución ejecutable, secesión unilateral, tratados de paz iniciales.                | No hay economía de mercado financiero, no hay meteorología CFD compleja, no hay viajes interestelares.    |
| **Beta (Escala)**       | Planeta dinámico completo, niebla de guerra autoritativa, 100 clientes sintéticos interactuando $>30$ min, pruebas de choque y disaster recovery. | No hay apertura masiva al público general; sin sistemas de pago con dinero real.                          |
| **Lanzamiento v1.0**    | Progresión completa de eras I a V, optimización 60 FPS p95 a 1080p, accesibilidad WCAG, soporte y live operations.                                | Expansiones galácticas no anunciadas.                                                                     |

---

## 3. Lista Explícita de "NO HACER TODAVÍA"

Para evitar la dispersión de esfuerzos y la sobreingeniería:

1. ❌ No construir microservicios desacoplados de red (mantener monolito modular).
2. ❌ No implementar economía de mercado financiero ni moneda en etapas I–IV.
3. ❌ No modelar física balística individual para miles de soldados.
4. ❌ No programar motores meteorológicos complejos basados en dinámica de fluidos (CFD).
5. ❌ No gastar recursos en integración con pasarelas de pago antes de tener un juego testeable y divertido.
