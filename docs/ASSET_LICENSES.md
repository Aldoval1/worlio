# Registro de Licencias y Auditoría de Activos 3D — Universo RTS
**Archivo:** `docs/ASSET_LICENSES.md`  
**Edición:** Octubre 2026

---

## 1. Política de Licencias y Derechos de Uso
Universo RTS prohíbe de forma tajante el uso de activos visuales, texturas satelitales o modelos 3D sin licencia comercial legítima. En particular:
- ❌ **Prohibido:** Rips de modelos, mallas o texturas de otros videojuegos comerciales.
- ❌ **Prohibido:** Texturas o capturas 3D extraídas de Google Earth, Google Maps o Cesium ion comercial sin autorización.
- ✅ **Permitido:** Mallas procedurales matemáticas generadas en tiempo de ejecución, modelos propios modelados en Blender, y activos libres bajo licencias **CC0**, **MIT**, **Apache-2.0** o **CC-BY** (con debida atribución).

---

## 2. Matriz de Activos y Dependencias Iniciales

| Activo / Dependencia | Tipo | Versión / Fuente | Licencia | Estado de Auditoría |
| :--- | :--- | :--- | :--- | :---: |
| **Babylon.js (`@babylonjs/core`)** | Motor Gráfico 3D WebGPU | 7.x (NPM) | Apache-2.0 | ✅ APROBADO |
| **Babylon.js Loaders (`@babylonjs/loaders`)** | Cargadores glTF/GLB | 7.x (NPM) | Apache-2.0 | ✅ APROBADO |
| **Zod** | Validador de Esquemas | 3.x (NPM) | MIT | ✅ APROBADO |
| **Vitest** | Framework de Testing | 2.x (NPM) | MIT | ✅ APROBADO |
| **Tipografía de Interfaz** | System Sans / Inter | Fuentes del Sistema Operativo | SIL Open Font / System | ✅ APROBADO |
| **Terreno Cube-Sphere Procedural** | Malla y Normales Matemáticas | Código propio (`@universo/worldgen`) | MIT (Proyecto) | ✅ APROBADO |
| **Rejilla y Shaders WGSL** | Shaders procedimentales | Código propio (`apps/client`) | MIT (Proyecto) | ✅ APROBADO |
| **Modelos de Bloqueo / Mallas Grises** | Primitivas de Babylon | Mallas paramétricas nativas | MIT (Proyecto) | ✅ APROBADO |

---

## 3. Checklist Obligatorio para Importación de Nuevos Assets (.glb)
Antes de incorporar un archivo a `assets/export/`:
1. [ ] Origen conocido y verificado (autor, enlace o software de creación).
2. [ ] Licencia compatible con distribución comercial sin royalties (MIT, CC0, Apache-2.0).
3. [ ] Nomenclatura conforme a la convención: `{era}_{categoria}_{variante}_{lod}.glb`.
4. [ ] Pivote centrado en la base del suelo ($Y=0$).
5. [ ] Presupuesto poligonal respetado según LOD (LOD0: $<2500$ tri, LOD1: $<800$ tri, LOD2: $<200$ tri).
6. [ ] Texel density uniforme y atlas de textura optimizado para WebGPU.
