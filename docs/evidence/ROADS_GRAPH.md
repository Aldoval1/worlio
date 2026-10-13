# Manual de Arquitectura — Grafo Vial y Splines Planetarias (T21)
**Módulo:** `packages/domain/src/roads/` y `apps/client/src/roads/`  
**Escala:** Red de transporte terrestre urbana e interurbana.

---

## 1. Proyección de Curvas Spline sobre Superficies Planetarias

### 1.1 Formulación Catmull-Rom Cúbica
Dado un conjunto de puntos de control $\mathbf{P}_0, \mathbf{P}_1, \dots, \mathbf{P}_n$ en el espacio tridimensional ECEF, entre cada par de puntos $(\mathbf{P}_i, \mathbf{P}_{i+1})$ se evalúa:
$$\mathbf{P}(t) = \frac{1}{2} \left( 2\mathbf{P}_i + (-\mathbf{P}_{i-1} + \mathbf{P}_{i+1})t + (2\mathbf{P}_{i-1} - 5\mathbf{P}_i + 4\mathbf{P}_{i+1} - \mathbf{P}_{i+2})t^2 + (-\mathbf{P}_{i-1} + 3\mathbf{P}_i - 3\mathbf{P}_{i+1} + \mathbf{P}_{i+2})t^3 \right)$$

### 1.2 Anclaje al Relieve Planetario
Cada punto interpolado $\mathbf{P}(t)$ se proyecta radialmente hacia el centro del planeta:
$$\mathbf{u}(t) = \frac{\mathbf{P}(t)}{\|\mathbf{P}(t)\|}$$
$$R_{\text{road}}(t) = R_{\text{planet}} + H_{\text{terrain}}(\mathbf{u}(t)) + \delta_{\text{road}}$$
Donde $\delta_{\text{road}} = 0.12\text{ m}$ es el offset vertical de seguridad para evitar z-fighting con la malla del terreno en WebGPU.

### 1.3 Cálculo de Pendiente y Rasante
Para cada tramo infinitesimal entre muestras sucesivas $(\mathbf{S}_k, \mathbf{S}_{k+1})$:
$$d_{\text{seg}} = \|\mathbf{S}_{k+1} - \mathbf{S}_k\|$$
$$\text{Grade}\% = \frac{|\Delta h|}{d_{\text{seg}}} \times 100$$
Si $\text{Grade}\% > \text{Grade}_{\max} \times 1.5$, la carretera es rechazada obligando al urbanista a trazar terraplenes o túneles.

---

## 2. Topología del Grafo Vial (Nodos y Aristas)
El grafo se modela mediante:
- **Nodos (`RoadNode`):** Intersecciones o extremos de carretera con posición ECEF. El motor aplica *snapping* automático en radio de $5\text{ m}$.
- **Aristas (`RoadEdge`):** Tramos curvos con tipo de calzada, velocidad límite, longitud calculada y muestras proyectadas.
- **Enrutamiento A\* (`findPath`):** Búsqueda de caminos mínimos ponderada por el tiempo de viaje físico ($t = d / v_{\max}$).
