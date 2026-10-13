# Análisis de Rendimiento e Instanciado en GPU (Thin Instances) — Universo RTS
**Archivo:** `docs/evidence/GPU_INSTANCING.md`  
**Ticket:** T10  
**Edición:** Octubre 2026

---

## 1. Comparativa Arquitectónica de Instanciado en WebGPU

| Técnica | Mallas en Escena | Draw Calls (1.000 objs) | Draw Calls (10.000 objs) | Overhead CPU por Frame | Consumo de Memoria VRAM |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Mallas Independientes (`CreateBox`)** | 1.000 / 10.000 | 1.000 | 10.000 | Crítico (bucle CPU de 10k llamadas) | Alto ($\approx 12 - 40$ MB en objetos y nodos) |
| **Instancias Clásicas (`createInstance`)** | 1 raíz + $N$ instancias | $\approx 10 - 50$ (por batches) | $\approx 100 - 500$ | Medio (gestión de nodos en grafo de escena) | Medio ($\approx 4 - 8$ MB) |
| **Thin Instances (`thinInstanceSetBuffer`)** | **1 sola malla raíz** | **1 draw call** | **1 draw call** | **Mínimo** (GPU renderiza todo el buffer en 1 comando) | **Óptimo** (64 KB para 1k, 640 KB para 10k) |

---

## 2. Resultados de Medición y Escalabilidad
1. **Huella de Memoria (VRAM):**
   - Para 1.000 edificios: $1.000 \times 16 \text{ floats} \times 4 \text{ bytes} = 64.000\text{ bytes}$ (**64 KB**).
   - Para 10.000 edificios: $10.000 \times 16 \text{ floats} \times 4 \text{ bytes} = 640.000\text{ bytes}$ (**640 KB**).
   - La huella de memoria para 10.000 edificios en GPU es inferior a **1 MB**, lo cual se mantiene sobradamente dentro del presupuesto de VRAM de 1024 MB.
2. **Impacto en Draw Calls:**
   - La reducción de 10.000 llamadas a 1 única llamada elimina el cuello de botella tradicional de CPU en navegadores web.
3. **Actualización Dinámica Parcial:**
   - La API `thinInstanceSetMatrixAt(index, matrix, true)` permite actualizar el estado o posición de un edificio individual (ej. demolición, mejora de nivel) sin necesidad de reconstruir o reenviar todo el buffer de 640 KB.

---

## 3. Conclusión y Decisión de Ingeniería
Se ratifica el uso de **Thin Instances** como estándar obligatorio para la representación de:
- Edificios privados residenciales, comerciales e industriales.
- Vegetación procedural y rocas (props de bioma).
- Vehículos y convoyes urbanos.
