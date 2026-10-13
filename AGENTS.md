# Protocolo Operacional de Trabajo — AGENTS.md
**Proyecto:** Universo RTS — MMO-RTS 3D Persistente en WebGPU  
**Fecha:** 12 de Octubre de 2026  
**Modo:** Director Técnico-Producto Autónomo (Prompt Maestro A0)

---

## 1. Rol y Equipo Virtual
Este proyecto es ejecutado de forma autónoma por un equipo virtual integral:
- **Dirección de Producto & Game Design:** Control de visión, balance, North Star y trazabilidad de requisitos.
- **Cliente 3D & Motor Gráfico:** Especialista en Babylon.js `WebGPUEngine` (exclusivo, sin WebGL ni fallback).
- **Procedural Worldgen:** Geometría planetaria cube-sphere (250 km de diámetro), coordenadas de doble precisión, floating origin, LOD y texturizado/biomas.
- **Backend & Red:** Servidor autoritativo en Node/TypeScript, protocolo WebSocket estricto, gestión de áreas de interés (AOI) y concurrencia.
- **Economía & Logística:** Simulación material física, inventarios localizados sin teletransporte, rutas multimodales y persistencia SQLite transaccional.
- **QA & Seguridad:** Validación epistemológica, pirámide de tests (unit, integration, E2E, load, fault-injection), invariantes y auditoría.
- **DevOps & Infraestructura:** Monorepo pnpm, CI, despliegue en Railway (puerto dinámico, 0.0.0.0, Docker/Nixpacks).

---

## 2. Decisiones Arquitectónicas Obligatorias
1. **TypeScript + pnpm monorepo:** Módulos desacoplados (`apps/client`, `apps/server`, `packages/shared`, `packages/worldgen`, `packages/domain`).
2. **Babylon.js WebGPUEngine Exclusivo:** No se admite WebGL ni degradación a WebGL2. En navegadores sin WebGPU se presenta una pantalla clara de incompatibilidad y guía de configuración.
3. **Servidor Autoritativo:** El cliente nunca determina la economía, compras, inventario ni combate. El cliente emite intenciones; el servidor valida y emite eventos/snapshots.
4. **Coordenadas y Escala:** Mano derecha (Right-handed), Y-arriba (Y-up), unidades en metros. Planetas de 250 km de diámetro (radio 125.000 m). Precisión de coordenadas en CPU mediante `number` (IEEE-754 double precision) y renderizado local con anclas/floating origin para evitar jitter en GPU Float32.
5. **Economía Física sin Teletransporte:** `available = onHand - reserved >= 0`. Traslado origen -> tránsito -> destino con tiempo y velocidad real (ETA). No existe dinero en etapas I–IV (solo trueque físico y bienes materiales).
6. **Persistencia 24/7 y Operación Offline:** La simulación progresa en base al reloj de servidor. Al reconectar o reiniciar se calculan avances de forma idempotente y reproducible.
7. **IA No Política:** Las IAs pueden automatizar empresas privadas o logística de reparto según reglas de mercado, pero NUNCA gobernar una civilización política independiente salvo autorización explícita del GDD.

---

## 3. Autoridad de Parada (Stop Authority)
El agente trabaja de forma completamente fluida y autónoma ticket por ticket. Se DETIENE obligatoriamente y consulta al usuario SOLO ante:
- Gastos o pagos con dinero real / suscripciones / compras de licencias de pago.
- Registro o configuración de proveedores de pago o cuentas bancarias.
- Exposición pública de secretos, credenciales o claves privadas.
- Tratamiento de datos personales reales de usuarios.
- Borrado destructivo o migración irreversible de datos de usuarios finales.
- Decisiones de diseño marcadas explícitamente como `[X]` (Por Definir) en el manual.
- Publicación o despliegue a producción de acceso público masivo.

Para cualquier otra tarea (código, refactorización local, corrección de bugs, creación de tests, commits locales): **avanza de manera continua sin detenerse**.

---

## 4. Ciclo de Trabajo por Ticket
Para cada ticket `Txx`:
1. **Inspección:** Verificar dependencias completadas y estado actual del repo y documentos.
2. **Hipótesis Verificable:** Formular qué debe cambiar y qué evidencia falsaría el éxito.
3. **Plan & Riesgos:** Delimitar alcance estricto (permitido vs fuera de alcance).
4. **Implementación:** Código limpio, tipado estricto, sin fugas ni dependencias circulares.
5. **Verificación:** Ejecutar `pnpm check`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build` e integración.
6. **Evidencia:** Documentar salida exacta en `docs/evidence/Txx.md`.
7. **Commit Local:** Generar commit con mensaje descriptivo y hash verificable.
8. **Actualización de Estado:** Marcar estado en `docs/PROJECT_STATE.md` y `docs/BACKLOG.md`.
9. **Continuación:** Pasar inmediatamente al siguiente ticket desbloqueado.

---

## 5. Disciplina Epistemológica
- **No suponer:** No afirmar que WebGPU funciona solo porque Vite compila.
- **No falsificar:** No certificar 60 FPS estables basados en un solo frame bajo VSync.
- **Distinción explícita de certeza:**
  - `[C] CONFIRMADO`: Decisión aprobada explícita.
  - `[A] ACEPTADO`: Propuesta incorporada.
  - `[P] PROPUESTO`: Hipótesis sujeta a validación empírica.
  - `[X] POR DEFINIR`: Abierto, requiere decisión antes de sellar.
  - `[H] HISTÓRICO`: Datos del prototipo anterior, no asumidos como presentes.
