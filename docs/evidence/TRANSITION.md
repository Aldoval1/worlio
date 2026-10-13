# Informe de Continuidad Espacial y Horizonte Físico (T17)
**Documento:** `docs/evidence/TRANSITION.md`  
**Fecha:** 2026-10-12  
**Componentes:** `apps/client/src/navigation/transitionCoordinator.ts`, `atmosphereFog.ts`

---

## 1. Fundamentos Matemáticos de la Transición Continua

Para preservar el invariante arquitectónico de **Un Universo Compartido**, el descenso de la cámara desde la órbita espacial profunda ($300\text{ km}$) hasta el suelo ($50\text{ m}$) no puede recurrir a recargas de escena, saltos de coordenadas ni "skyboxes" falsos desconectados de la simulación.

### A. Ecuación del Horizonte Físico
La distancia visible al horizonte sobre una esfera de radio $R = 125.000\text{ m}$ a una altitud $h$ está dada por:
$$d_{\text{horizon}} = \sqrt{h^2 + 2 R h}$$

A diferentes alturas:
- **Órbita ($100\text{ km}$):** $d_{\text{horizon}} \approx 187.082\text{ m}$ (se visualiza el casquete planetario completo).
- **Sub-orbital ($10\text{ km}$):** $d_{\text{horizon}} \approx 50.990\text{ m}$ (la curvatura del planeta es visible en los bordes).
- **Regional ($500\text{ m}$):** $d_{\text{horizon}} \approx 11.191\text{ m}$ (el horizonte se percibe casi plano).

### B. Ocultamiento de Curvatura y Horizonte Terrestre
Al penetrar en la atmósfera baja ($h \le 2.000\text{ m}$), los planos de niebla lineal se sincronizan con $d_{\text{horizon}}$:
$$\text{fogStart} = 0.35 \cdot d_{\text{horizon}}, \quad \text{fogEnd} = 1.15 \cdot d_{\text{horizon}}$$
Esto garantiza que la concha esférica que desciende más allá del horizonte local queda cubierta por la niebla atmosférica diurna, transformando de manera completamente natural la esfera en un horizonte horizontal expansivo.

---

## 2. Continuidad Angular y Slerp de Cuaterniones

Para evitar singularidades de Euler (gimbal lock) y roll accidental:
- La orientación de la cámara se calcula en coordenadas esféricas continuas.
- La interpolación entre el cuaternión orbital $Q_{\text{orbit}}$ (orientado al polo geográfico) y el cuaternión de superficie $Q_{\text{ground}}$ (orientado al plano tangente ENU local) se realiza mediante:
$$Q(t) = \text{Slerp}(Q_{\text{orbit}}, Q_{\text{ground}}, t), \quad t = \text{smoothstep}(80000, 2000, h)$$
- Al ser normalizado $\|Q(t)\| = 1.0$, la velocidad angular permanece $C^1$ continua sin saltos bruscos.
