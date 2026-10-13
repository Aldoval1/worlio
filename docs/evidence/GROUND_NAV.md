# Manual Técnico y Arquitectura — Navegación al Suelo (T18)
**Componente:** `apps/client/src/navigation/groundCollision.ts` y `rtsCameraController.ts`  
**Escala:** $2\text{ m}$ a $25.000\text{ m}$ sobre el relieve planetario.

---

## 1. Principio Físico y Matemático

### 1.1 Detección de Altitud Libre y Penetración
Dado el centro de masas del planeta en el origen geocéntrico $(0, 0, 0)$ y una posición de cámara $\mathbf{P} = (x, y, z)$:
1. Vector radial unitario: $\mathbf{u} = \frac{\mathbf{P}}{\|\mathbf{P}\|}$.
2. Elevación del terreno: $h = \text{TerrainSampler}(\mathbf{u})$.
3. Radio de la superficie sólida: $R_{\text{surf}} = R_{\text{planet}} + h$.
4. Distancia libre vertical: $\delta = \|\mathbf{P}\| - R_{\text{surf}}$.
5. Invariante de seguridad: $\delta \ge \delta_{\min} = 2.0\text{ m}$.

Si $\delta < \delta_{\min}$, la posición corregida es:
$$\mathbf{P}_{\text{corrected}} = \mathbf{u} \cdot (R_{\text{surf}} + \delta_{\min})$$

### 1.2 Normal de Relieve por Diferencias Finitas
En una esfera planetaria de radio $R$, se definen dos direcciones ortonormales tangenciales $(\mathbf{T}, \mathbf{B})$ perpendiculares a $\mathbf{u}$.
Con un paso métrico $\Delta s = 5\text{ m}$ (paso angular $\Delta \theta = \frac{\Delta s}{R}$):
$$\frac{\partial H}{\partial \mathbf{T}} = \frac{h(\mathbf{u} + \Delta\theta\mathbf{T}) - h(\mathbf{u} - \Delta\theta\mathbf{T})}{2\Delta s}$$
$$\frac{\partial H}{\partial \mathbf{B}} = \frac{h(\mathbf{u} + \Delta\theta\mathbf{B}) - h(\mathbf{u} - \Delta\theta\mathbf{B})}{2\Delta s}$$
La normal exterior no normalizada es:
$$\mathbf{N}' = \mathbf{u} - \frac{\partial H}{\partial \mathbf{T}}\mathbf{T} - \frac{\partial H}{\partial \mathbf{B}}\mathbf{B}, \quad \mathbf{N} = \frac{\mathbf{N}'}{\|\mathbf{N}'\|}$$

### 1.3 Deslizamiento en Pendientes (Slope Deflection)
Si la velocidad de navegación $\mathbf{v}$ intenta penetrar una montaña:
$$\mathbf{v} \cdot \mathbf{N} < 0$$
El vector se deflexiona sobre el plano tangente de la montaña eliminando la componente penetrante:
$$\mathbf{v}_{\text{slide}} = \mathbf{v} - (\mathbf{v} \cdot \mathbf{N}) \mathbf{N}$$
De este modo, $(\mathbf{v}_{\text{slide}} \cdot \mathbf{N}) = 0$, permitiendo a la cámara recorrer laderas escarpadas suavemente sin atravesarlas.

---

## 2. Controlador de Cámara RTS
El controlador calcula un marco de referencia local ENU (East-North-Up) en el punto de interés en el suelo.
- **Picado (Pitch):** Clampeado entre $25^\circ$ y $88^\circ$ respecto a la horizontal local.
- **Seguimiento de relieve:** Al desplazarse con WASD o cursor, el punto objetivo re-muestrea la elevación del terreno en cada paso de simulación, permitiendo al usuario navegar libremente a ras de suelo (desde 2 metros) sobre cordilleras y valles.
