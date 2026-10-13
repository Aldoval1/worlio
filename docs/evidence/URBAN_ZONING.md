# Manual de Arquitectura — Zonificación, Parcelación y Edificación Privada (T22)
**Módulo:** `packages/domain/src/urban/`  
**Escala:** Simulación urbana y microeconomía inmobiliaria.

---

## 1. Parcelación Adyacente a Carreteras

### 1.1 Geometría de Parcelación en Superficie Esférica
Para cada arista del grafo vial con puntos muestreados $\mathbf{S}_0, \dots, \mathbf{S}_m$ a lo largo de la spline proyectada:
1. Se recorre la arista acumulando distancia métrica $s$.
2. Para cada ranura de parcela con anchura $W$ (default $16\text{ m}$) y profundidad $D$ (default $20\text{ m}$):
   - Se calcula el vector tangente unitario local $\mathbf{t} = \frac{\mathbf{S}_{k+1} - \mathbf{S}_k}{\|\mathbf{S}_{k+1} - \mathbf{S}_k\|}$.
   - Se obtiene la normal radial planetaria $\mathbf{n} = \frac{\mathbf{S}_k}{\|\mathbf{S}_k\|}$.
   - Se deriva el vector lateral binormal $\mathbf{b} = \mathbf{t} \times \mathbf{n}$.
3. Se generan parcelas simétricas:
   $$\mathbf{C}_{\text{LEFT}} = \mathbf{S}(s) - \mathbf{b} \cdot \left(\frac{W_{\text{road}}}{2} + \frac{D}{2}\right)$$
   $$\mathbf{C}_{\text{RIGHT}} = \mathbf{S}(s) + \mathbf{b} \cdot \left(\frac{W_{\text{road}}}{2} + \frac{D}{2}\right)$$
4. La orientación se proyecta a la esfera garantizando continuidad topológica con el relieve.

---

## 2. Tipologías de Zona (R/C/I)

| Tipo de Zona | Finalidad | Insumos Requeridos | Mano de Obra |
|---|---|---|---|
| `RESIDENTIAL` | Vivienda de ciudadanos y mano de obra | Madera: 20, Piedra: 15, Hierro: 5 | 8 horas-hombre |
| `COMMERCIAL` | Intercambio de bienes y servicios | Madera: 25, Piedra: 30, Hierro: 10 | 14 horas-hombre |
| `INDUSTRIAL` | Transformación y manufactura pesada | Madera: 15, Piedra: 40, Hierro: 35 | 20 horas-hombre |

---

## 3. Las Tres Leyes de Edificación Privada
La simulación autoritativa en `privateBuildingEngine.ts` impone:
1. **Acceso Vial Comprobado:** Solo parcelas con enlace activo en `RoadNetworkGraph` conectadas a una red de suministro pueden edificar.
2. **Capacidad Laboral Disponible:** La ciudad debe disponer de trabajadores desocupados suficientes para ejecutar la construcción.
3. **Fisicalidad de Materiales:** El almacén logístico local debe poseer stock real sin reservas previas:
   $$\text{onHand} - \text{reserved} \ge \text{coste\_material}$$
   El proceso efectúa una reserva formal (`reserve`) seguida de su consumo inmediato (`consumeReserved`), impidiendo la creación espontánea de bienes.
