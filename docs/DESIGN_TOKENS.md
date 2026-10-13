# Sistema de Tokens de Diseño (Design Tokens) — Universo RTS
**Archivo:** `docs/DESIGN_TOKENS.md`  
**Edición:** Octubre 2026

---

## 1. Tokens de Color (Tema Oscuro Estratégico)
```css
:root {
  /* Fondos y Superficies */
  --color-bg-space: #071526;
  --color-surface-panel: rgba(13, 43, 73, 0.82);
  --color-surface-card: rgba(7, 21, 38, 0.65);
  --color-surface-glass-border: rgba(255, 255, 255, 0.1);

  /* Texto y Contraste (WCAG AA Cumplido) */
  --color-text-primary: #EAF2F7;     /* Contraste 14.2:1 sobre panel */
  --color-text-secondary: #94A3B8;   /* Contraste 5.6:1 sobre panel */
  --color-text-muted: #64748B;       /* Contraste 3.2:1 */

  /* Acentos y Acciones */
  --color-accent-primary: #14B8A6;   /* Turquesa interactivo */
  --color-accent-primary-hover: #0D9488;
  --color-accent-secondary: #38BDF8; /* Azul cyan espacial */

  /* Estados Operacionales */
  --color-status-success: #10B981;   /* Verde esmeralda */
  --color-status-warning: #D4AE67;   /* Ámbar de alerta/espera */
  --color-status-error: #D96A64;     /* Coral de error/guerra */
  --color-status-blocked: #64748B;   /* Gris bloqueado por permiso */
}
```

---

## 2. Tipografía y Escalas
- **Familia Primaria:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`
- **Familia Monospace:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- **Escalas:**
  - Encabezados Principales: `1.25rem` ($20\text{ px}$) / `font-weight: 800`
  - Títulos de Sección: `0.95rem` ($15.2\text{ px}$) / `font-weight: 700`
  - Texto Estándar: `0.80rem` ($12.8\text{ px}$) / `font-weight: 500`
  - Etiquetas y Badges: `0.65rem` ($10.4\text{ px}$) / `font-weight: 700`

---

## 3. Accesibilidad y Ergonomía
- **Modo Movimiento Reducido (`prefers-reduced-motion`):**
  - Desactiva amortiguación excesiva de cámara (*damping* prolongado).
  - Anula animaciones de transición en paneles HUD.
- **Foco por Teclado:**
  - Anillo de enfoque visible de $2\text{ px}$ en `#14B8A6` con desplazamiento de $2\text{ px}$.
- **Escala de UI Configurable:** Modificadores de escala de interfaz de $80\%$, $100\%$, $125\%$ y $150\%$.
