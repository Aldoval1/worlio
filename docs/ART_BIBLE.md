# Biblia de Arte y Dirección Visual — Universo RTS

**Archivo:** `docs/ART_BIBLE.md`  
**Edición:** Octubre 2026  
**Dirección Visual:** «Semirrealismo Estratégico Legible»

---

## 1. Filosofía y Estilo Artístico

El estilo visual de **Universo RTS** busca equilibrar la belleza y majestuosidad de la escala planetaria con la absoluta claridad táctica requerida por un videojuego de estrategia y construcción:

- **Paisajes Naturales:** Coherentes y creíbles desde la órbita (continentes sólidos, costas bien delimitadas, cadenas montañosas con valles y niebla atmosférica sutil).
- **Arquitectura y Asentamientos:** 3D estilizado con proporciones físicas verosímiles y siluetas inmediatamente reconocibles desde la cámara cenital/isométrica.
- **Prohibición de Estilos Incompatibles:** Evitar mezclar modelos fotogramétricos hiperrealistas con caricaturas _low-poly_ saturadas. Iluminación PBR unificada, sombras suaves y jerarquía visual estricta.

---

## 2. Paleta de Color y Tokens Visuales

### Interfaz de Usuario (HUD):

- **Fondo Tinta Espacial:** `#071526`
- **Superficie de Paneles:** `#0D2B49` (con blur de fondo / translúcido al 75%)
- **Texto Principal:** `#EAF2F7`
- **Acento / Acción Primaria:** `#14B8A6` (Turquesa dinámico)
- **Advertencia / Escasez:** `#D4AE67` (Ámbar)
- **Peligro / Error / Guerra:** `#D96A64` (Coral / Rojo)

### Entorno y Biomas:

- **Océano Profundo:** `#0E2443` | **Aguas Costeras:** `#1E4E79`
- **Tierras Bajas / Praderas:** `#325234` | **Vegetación Densa:** `#233D25`
- **Roca / Montaña:** `#484E59` | **Cumbres Nevadas:** `#E2E8F0`
- **Desierto / Árido:** `#BA9D72` | **Tierra Cultivable:** `#5C4033`

---

## 3. Especificación Técnica 3D por Escala

| Escala                | Rango de Distancia              | Lenguaje Visual                                                       | Optimización / Límite                                                           |
| :-------------------- | :------------------------------ | :-------------------------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Órbita**            | $150\text{ km} - 600\text{ km}$ | Esfera sólida de 250 km, continentes, biomas y atmósfera.             | Chunks de baja resolución, sombras globales; sin mallas de árboles.             |
| **Región**            | $10\text{ km} - 150\text{ km}$  | Costas, cordilleras, manchas urbanas y carreteras mayores.            | LOD intermedio de terreno, mallas HLOD para distritos urbanos completos.        |
| **Ciudad**            | $200\text{ m} - 10\text{ km}$   | Carreteras transitables, parcelas zonificadas, edificios y almacenes. | Instancing de edificios (Thin Instances), atlas de texturas compartidos.        |
| **Suelo / Edificio**  | $2\text{ m} - 200\text{ m}$     | Fachadas detalladas, andamios en obras, carretas y convoyes físicos.  | Modelos LOD0 con colisiones y puertas visibles; sin interiores forzados.        |
| **Espacio / Sistema** | $> 1.000\text{ km}$             | Soles, órbitas, naves interestelares y corredores de navegación.      | Escala estratégica simplificada; sin renderizar superficie planetaria a la vez. |

---

## 4. Evolución de Materiales por Eras

1. **Era I (Primitiva):** Madera sin pulir, troncos, cañas, paja, barro y piedra rústica.
2. **Era II (Antigua / Medieval):** Muros de sillería de piedra caliza, vigas escuadradas, mortero, tejas cerámicas y empalizadas.
3. **Era III (Moderna Temprana):** Ladrillo cocido, techos de pizarra, puertos de madera tratada, herrajes de forja y fortificaciones abaluartadas.
4. **Era IV (Industrial / Tecnológica):** Acero laminado, hormigón armado, vidrio plano, ladrillo fabril oscuro, raíles de hierro y cableado de cobre.
5. **Era V (Futurista / Espacial):** Aleaciones compuestas de titanio, paneles solares de silicio avanzado, cerámicas térmicas y módulos presurizados.

---

## 5. Pipeline de Activos y Licencias

- **Unidad de Medida:** 1 unidad = 1 metro.
- **Pivote:** Siempre en el centro de la base del cimiento ($Y=0$).
- **Convención de Nombres:** `era_categoria_variante_lod` (ej. `e2_almacen_piedra_lod0.glb`).
- **Auditoría Legal Estricta:** Ningún modelo o textura puede provenir de extracciones no autorizadas de Google Earth, Cesium 3D Tiles comerciales ni rips de juegos existentes. Todos los activos deben ser modelados procedimentalmente o amparados por licencias libres comerciales (CC0, MIT, CC-BY con atribución en `docs/ATTRIBUTION.md`).
