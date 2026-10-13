# Registro de Riesgos Técnicos y de Producto — Universo RTS
**Archivo:** `docs/RISK_REGISTER.md`  
**Edición:** Octubre 2026

---

## 1. Matriz de Riesgos Principales (P0 y Críticos)

| ID | Riesgo | Probabilidad | Impacto | Severidad | Mitigación Técnica Primaria |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **R-01** | **Jitter de Float32 en GPU al descender al suelo** | Alta | Crítico | **P0** | Emplear `Floating Origin` / anclas locales de tile calculadas en Float64 en CPU antes de enviar matrices a GPU (ADR-0004). |
| **R-02** | **Costo de memoria y stutter al generar mallas orbitales** | Alta | Alto | **P0** | Generación asíncrona por chunks diádicos, colas con presupuesto de tiempo por frame (máx 3 ms/frame) y caché LRU de mallas (T14, T15). |
| **R-03** | **Duplicación o fuga de inventarios bajo fallos de red** | Media | Crítico | **P0** | Invariante atómico `available = onHand - reserved >= 0`, transacciones ACID SQLite, claves de idempotencia independientes y libro mayor auditable (T29, T37). |
| **R-04** | **Incompatibilidad de WebGPU en navegadores de usuarios** | Media | Alto | **P0** | Detección limpia con pantalla de bienvenida/diagnóstico explicativa; no fallback WebGL2 (ADR-0001). |
| **R-05** | **Explosión de tráfico de red al hacer zoom out a órbita** | Alta | Alto | **P0** | Gestión de área de interés (AOI) y niveles de agregación: en órbita solo se reciben datos regionales agregados, no el estado individual de cada carreta (T39). |
| **R-06** | **Coste operativo insostenible de simulación persistente 24/7** | Media | Alto | **P1** | Simulación por colas de eventos futuros (event queue con deadlines), evitando calcular física cuadro a cuadro de entidades lejanas a cualquier jugador (T36). |
| **R-07** | **Conflictos políticos y vacíos de poder por líderes inactivos** | Alta | Medio | **P1** | Mecanismo de secesión municipal unilateral inmutable (ADR-0007) y reglas de caducidad de mandatos en constituciones. |
| **R-08** | **Infracción involuntaria de licencias en assets o texturas** | Baja | Crítico | **P0** | Pipeline estricto de auditoría de licencias (`docs/ASSET_LICENSES.md`) prohibiendo texturas comerciales de Google Earth, Cesium o juegos de terceros (T07, T61). |

---

## 2. Límites y Fronteras de Alcance P0 (Lo que NO se hace en P0)
Para proteger la viabilidad del primer Vertical Slice, se establecen los siguientes límites explícitos:
- ❌ **NO simulación molecular ni física balística individual de soldados:** Los ejércitos se resuelven como formaciones estratégicas agregadas.
- ❌ **NO meteorología CFD ni simulación tectónica profunda:** El clima y relieve son modelos simplificados matemáticos orientados a la jugabilidad.
- ❌ **NO dinero ni economía de tokens en etapas I–IV:** Solo bienes materiales tangibles y trueque directo.
- ❌ **NO redes de microservicios distribuidos antes de tiempo:** Se adopta un monolito modular Node.js con SQLite transaccional. La partición por zonas distribuidas se abordará en Fase 6 tras medir cuellos de botella reales.
