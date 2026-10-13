# Arquitectura y Clasificación Bioclimática Whittaker — Biomas y PBR (T19)
**Módulo:** `packages/worldgen/src/biomes/`  
**Objetivo:** Identificación visual inequívoca de biomas y sombreado topográfico desde órbita ($300\text{ km}$) hasta suelo ($2\text{ m}$).

---

## 1. Modelo Bioclimático de Whittaker

### 1.1 Gradiente Térmico Global y Altitudinal
La temperatura en cualquier punto de la esfera planetaria se modela como:
$$T = T_{\text{base}} - \alpha_{\text{lat}} \cdot |\sin\phi| - \Gamma_{\text{adiab}} \cdot \max(0, h - h_{\text{sea}})$$
Donde:
- $T_{\text{base}} = 28.0^\circ\text{C}$ (temperatura ecuatorial a nivel del mar).
- $|\sin\phi| = |d_y|$ (latitud absoluta normalizada entre 0 y 1).
- $\alpha_{\text{lat}} = 43.0^\circ\text{C}$ (amplitud térmica latitudinal; los polos rondan $-15^\circ\text{C}$).
- $\Gamma_{\text{adiab}} = 0.0065^\circ\text{C}/\text{m}$ (gradiente adiabático seco/húmedo promedio: $6.5^\circ\text{C}$ por km).

### 1.2 Humedad Determinista
El contenido de humedad $M \in [0.0, 1.0]$ se calcula mediante síntesis fractal Simplex 3D octavada combinada con factores orográficos:
$$M = \text{clamp}\left(\text{FBM}(3\mathbf{u}) + \text{Bonus}_{\text{costa/valle}}, 0.0, 1.0\right)$$

### 1.3 Matriz de Decisión de Biomas
| Rango Térmico ($T$) | Rango Humedad ($M$) | Altitud / Posición | Bioma Resultante |
| :--- | :--- | :--- | :--- |
| Cualquiera | Cualquiera | $h \le -250\text{ m}$ | `OCEAN` |
| Cualquiera | Cualquiera | $-250\text{ m} < h \le 0$ | `SHALLOW_WATER` |
| Cualquiera | Cualquiera | $0 < h \le 20\text{ m}$ | `BEACH_SAND` |
| $T \le -9.0^\circ\text{C}$ o $h > 3400\text{ m}$ | Cualquiera | Cumbres altas / Polos | `SNOW_PEAK` |
| $-9^\circ\text{C} < T < 8^\circ\text{C}$ | $M > 0.38$ | Subpolar / Montaña media | `BOREAL_TAIGA` |
| $-9^\circ\text{C} < T < 8^\circ\text{C}$ | $M \le 0.38$ | Subpolar árido | `TUNDRA` |
| $8^\circ\text{C} \le T < 20^\circ\text{C}$ | $M \ge 0.60$ | Templado húmedo | `TEMPERATE_FOREST` |
| $8^\circ\text{C} \le T < 20^\circ\text{C}$ | $0.28 \le M < 0.60$ | Templado medio | `TEMPERATE_GRASSLAND` |
| $8^\circ\text{C} \le T < 20^\circ\text{C}$ | $M < 0.28$ | Continental árido | `DESERT` |
| $T \ge 20^\circ\text{C}$ | $M \ge 0.58$ | Ecuatorial húmedo | `TROPICAL_RAINFOREST` |
| $T \ge 20^\circ\text{C}$ | $0.28 \le M < 0.58$ | Ecuatorial medio | `SAVANNA` |
| $T \ge 20^\circ\text{C}$ | $M < 0.28$ | Desierto cálido | `DESERT` |

---

## 2. Normal Topográfica Analítica

En lugar de aproximar la iluminación con la normal esférica $\mathbf{d} = (x/r, y/r, z/r)$, cada vértice calcula las tangentes en su tesela $33 \times 33$:
$$\mathbf{T}_u = \mathbf{P}(i+1, j) - \mathbf{P}(i-1, j)$$
$$\mathbf{T}_v = \mathbf{P}(i, j+1) - \mathbf{P}(i, j-1)$$
$$\mathbf{N}_{\text{mesh}} = \frac{\mathbf{T}_u \times \mathbf{T}_v}{\|\mathbf{T}_u \times \mathbf{T}_v\|}$$
Si $\mathbf{N}_{\text{mesh}} \cdot \mathbf{P} < 0$, se invierte para asegurar orientación externa.

Esto dota al motor WebGPU de sombreado de relieve real bajo el sol: crestas iluminadas, laderas opuestas en penumbra y cañones con contraste físico preciso.
