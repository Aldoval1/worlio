# Universo RTS — Visión, GDD y Requisitos Maestros

**Documento:** `docs/00_VISION.md`  
**Edición:** Octubre 2026  
**Estado:** [C] CONFIRMADO (Línea Base Maestro)

---

## 1. Declaración de Visión y North Star

**Universo RTS** es un videojuego comercial MMO-RTS y constructor de ciudades 3D persistente en navegador web:

- **Un único universo compartido:** Un cosmos continuo donde planetas, estrellas, naciones, ciudades, carreteras, ejércitos y almacenes mantienen su identidad y coordenadas físicas sin importar el nivel de zoom o la escala de observación.
- **Planetas esféricos procedurales:** Cuerpos celestes con diámetro conceptual de 250 km (radio 125.000 m), generados mediante cube-sphere determinista, con zoom continuo desde la órbita espacial hasta el nivel del suelo (2 metros sobre la superficie).
- **Ciudades y empresas privadas:** Jugadores en roles de alcaldes y gobernadores planifican infraestructuras, carreteras, almacenes y servicios; las empresas privadas construyen viviendas, comercios e industrias de forma automatizada según demanda, acceso vial y suministros reales.
- **Logística y economía material física:** Cero teletransporte de recursos. Toda mercancía tiene masa, volumen, ubicación física, titularidad y estado. Los traslados ocurren en vehículos reales con tiempos de viaje (ETA), sujetos a carreteras, puertos, bloqueos o accidentes.
- **Política viva y constituciones ejecutables:** Leyes y formas de gobierno que el servidor interpreta para autorizar o denegar comandos; elecciones, tratados de paz, embargos y derecho inmutable de secesión unilateral por parte de los alcaldes municipales.
- **Progreso histórico en 5 eras:** Desde el Paleolítico y Neolítico, pasando por la Antigüedad, Edad Media, Revolución Industrial y Era Digital, hasta la conquista espacial e interestelar.
- **Motor WebGPU Exclusivo:** Cliente gráfico desarrollado sobre Babylon.js `WebGPUEngine`, optimizado para hardware moderno sin concesiones a WebGL.

---

## 2. Referentes de Diseño y Distinción

| Referente             | Mecánica Inspiradora                                                                   | Lo que Universo RTS Hace Distinto                                                                                                                        |
| :-------------------- | :------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cities: Skylines**  | Trazado libre de carreteras, zonificación R/C/I y redes de servicios.                  | Multijugador masivo en un planeta esférico real; las ciudades se interconectan económicamente y políticamente con otras naciones de jugadores.           |
| **Age of Empires**    | Gestión de materias primas, cuarteles, progresión de eras y árboles tecnológicos.      | La economía no es un contador mágico centralizado en pantalla; los recursos deben extraerse, almacenarse y transportarse físicamente.                    |
| **Hearts of Iron IV** | Producción industrial, plantillas militares, frentes estratégicos y logística militar. | Interfaz accesible en tiempo real persistente; tropas consumen suministros físicos transportados desde almacenes reales.                                 |
| **Call of War**       | Persistencia 24/7 en tiempo real con órdenes estratégicas de largo plazo.              | Mundo completamente 3D en WebGPU, política cooperativa entre ciudadanos y un solo universo compartido sin resets arbitrarios.                            |
| **Stellaris / Spore** | Exploración galáctica, diplomacia interestelar y colonización de nuevos mundos.        | Continuidad geométrica absoluta: viajar de una choza neolítica a un puerto espacial y colonizar otro planeta sin pantallas de carga ni saltos de escena. |

---

## 3. Pilares de Experiencia

1. **Continuidad Geográfica Multiescala:** Órbita $\rightarrow$ Región $\rightarrow$ Ciudad $\rightarrow$ Edificio sin crear mapas planos sustitutos.
2. **Economía Físicamente Localizada:** Los inventarios existen en un almacén concreto; ningún recurso puede gastarse si no está físicamente disponible en el lugar de la obra o producción.
3. **Poder Político con Consecuencias Reales:** Los roles de alcalde, general, canciller o fundador tienen competencias exclusivas y fiscalizables por constitución.
4. **Operaciones con Tiempo Real:** No existe microgestión obligatoria; el jugador fija la estrategia y las prioridades, mientras los algoritmos resuelven la logística repetitiva.
5. **Evolución Histórica Progresiva:** La tecnología no crea recursos gratis; desbloquea nuevas capacidades de transformación, transporte y armas.
6. **Rendimiento Sostenido y Transparencia Técnica:** 60 FPS estables a 1080p como objetivo primario, respaldado por telemetría verificable.

---

## 4. Requisitos Clasificados

- **[C] Confirmados:**
  - Un único universo compartido y persistente 24/7.
  - Planetas de 250 km de diámetro (radio 125.000 m).
  - Coordenadas de mano derecha, Y-arriba, unidades en metros.
  - WebGPU exclusivo (Babylon.js WebGPUEngine), sin WebGL ni degradación silenciosa.
  - No hay dinero en etapas I–IV; economía basada en bienes físicos y trueque.
  - Toda transferencia de inventario consume tiempo y requiere ubicación (`available = onHand - reserved >= 0`).
  - Alcalde puede independizar su ciudad de forma unilateral.
  - Servidor autoritativo estricto; cliente no decide resultados económicos ni militares.
- **[A] Aceptados:**
  - Constituciones como estructuras de datos evaluables por el servidor para validar comandos.
  - Monorepo TypeScript / pnpm con cliente Vite + Babylon y servidor Node + WebSocket.
  - Persistencia con SQLite en modo WAL y snapshots de eventos.
- **[P] Propuestos (Exigen validación empírica):**
  - Generador procedural cube-sphere con ruido continuo 3D multioctava y muestreador de relieve `sampleTerrain`.
  - Cámara orbital inspirada en Cesium con anclaje al cursor y transición de marco local sin jitter.
  - Censo de desbloqueo planetario: 80% Neolítico para etapa II, 75% Baja Edad Media para etapa III, 70% Industrial para IV, 65% Digital para V.
  - Tiempos de ocupación militar urbana (15-30 min aldeas, hasta 12-24 h metrópolis).
- **[X] Por Definir (Requieren decisión explícita antes de sellar):**
  - Reglas de control de ejércitos al ocurrir una secesión unilateral (¿se dividen por origen o por juramento al general?).
  - Sistema de créditos universales en etapa Interestelar (emisión, masa monetaria, liquidez).
  - Nivel exacto de microcontrol en unidades navales, aéreas y espaciales.
  - Velocidades y física detallada de viajes interestelares.

---

## 5. Diez Historias de Usuario Concretas

1. **HU-01 (Navegación Continua):** Como observador, quiero rotar el planeta en órbita y descender suavemente con la rueda del ratón hasta 2 metros sobre una colina, para inspeccionar el terreno sin cambios bruscos ni pantallas de carga.
2. **HU-02 (Trazado Vial):** Como alcalde, quiero trazar una carretera curva entre dos puntos del terreno, para que el sistema calcule pendientes, coste de materiales y genere la vía respetando la orografía.
3. **HU-03 (Zonificación Urbana):** Como alcalde, quiero demarcar una zona residencial junto a una carretera pavimentada, para que ciudadanos y empresas privadas construyan viviendas acordes a la demanda y era actual.
4. **HU-04 (Extracción & Almacén):** Como gestor, quiero colocar una cantera de piedra y un almacén cercano, para que los trabajadores extraigan bloques y los depositen físicamente en las parcelas de inventario.
5. **HU-05 (Orden de Construcción):** Como alcalde, quiero ordenar la construcción de un ayuntamiento, para que el sistema reserve materiales en el almacén más cercano, despache un convoy y comience la obra al llegar la carga.
6. **HU-06 (Fallo Logístico & Resiliencia):** Como transportista/sistema, si un puente en la ruta de un convoy se rompe o bloquea, el vehículo debe detenerse o replanificar la ruta alternativa sin duplicar ni perder mercancía.
7. **HU-07 (Reclutamiento Militar):** Como general, quiero solicitar una compañía de 100 soldados de infantería, para que el alcalde apruebe los víveres y armas de los almacenes locales antes de iniciar el adiestramiento en el cuartel.
8. **HU-08 (Secesión Unilateral):** Como alcalde agraviado por las decisiones del rey, quiero activar el botón de independencia de mi ciudad, de modo que mi municipio pase a ser una nación soberana conservando sus edificios y existencias físicas locales.
9. **HU-09 (Diplomacia y Reparaciones):** Como canciller, quiero firmar un tratado de paz que estipule la entrega de 300 toneladas de madera como reparación, para que se emita una orden de envío físico desde nuestros almacenes hacia la capital enemiga.
10. **HU-10 (Persistencia Offline):** Como jugador que se desconecta por 8 horas, quiero volver a entrar y comprobar que las obras, investigaciones y convoyes en curso avanzaron exactamente según el reloj del servidor durante mi ausencia.

---

## 6. Perfiles de Hardware Objetivo

- **Perfil A (Target Recomendado - PC Escritorio / Portátil Potente):**
  - GPU: Apple Silicon (M1/M2/M3/M4) / NVIDIA RTX 3060 / AMD RX 6600 o superior.
  - Resolución: 1080p a 1440p, 60 FPS estables (frame budget $\le 16.6$ ms).
  - Conexión: Banda ancha cableada o Wi-Fi 6 ($<50$ ms latencia, $<0.1\%$ pérdida).
- **Perfil B (Target Mínimo Aceptable - Portátil Ligero / Ultrabook):**
  - GPU: Intel Iris Xe / AMD Radeon 680M / GPU integrada compatible con WebGPU.
  - Resolución: 1080p con escalado dinámico (DPR 1.0), $\ge 30$ FPS (frame budget $\le 33.3$ ms).
  - Conexión: 4G/5G o Wi-Fi doméstico ($<120$ ms latencia).
- **Perfil C (Laboratorio & Estrés - Servidor / Headless / Emulador):**
  - GPU de testing (Vulkan/Metal emulado o GPU dedicada en CI).
  - Objetivo: Verificar que no haya fugas de memoria, cuelgues del dispositivo ni violaciones de invariantes de red.

---

## 7. Árbol de Competencias por Eras

1. **Etapa I (Primitiva):**
   - _Paleolítico:_ Talla de sílex, recolección, refugios de ramas, fuego, lanzas de madera.
   - _Neolítico:_ Agricultura básica, domesticación, cerámica, herramientas de piedra pulida, chozas de barro, empalizadas.
2. **Etapa II (Antigua / Medieval):**
   - _Bronce:_ Metalurgia del cobre y estaño, rueda, carretas de bueyes, escritura cuneiforme, murallas de piedra.
   - _Hierro:_ Forja de hierro, calzadas adoquinadas, acueductos, catapultas, monedas de trueque regulado.
   - _Clásica:_ Filosofía, arquitectura monumental, falanges y legiones, navegación a vela de cabotaje.
   - _Alta Edad Media:_ Feudalismo, estribo, molinos de agua, castillos de sillería, caballería pesada.
   - _Baja Edad Media:_ Gremios artesanales, ballestas, altos hornos primitivos, universidades, pólvora temprana.
3. **Etapa III (Moderna Temprana):**
   - _Renacimiento:_ Imprenta, galeones oceánicos, bastiones abaluartados, contabilidad de doble entrada.
   - _Exploración:_ Navegación astronómica, rutas ultramarinas, mosquetes, cartografía global.
   - _Ilustración:_ Método científico, academias de ciencias, banca comercial, artillería moderna.
   - _Primera Revolución Industrial:_ Máquina de vapor, telares mecánicos, canales navegables, coque y hierro colado.
4. **Etapa IV (Industrial / Tecnológica):**
   - _Segunda Revolución Industrial:_ Acero Bessemer, ferrocarril, electricidad, motor de combustión interna, telégrafo.
   - _Atómica:_ Fisión nuclear, aviación a reacción, radar, fertilizantes sintéticos, antibióticos.
   - _Digital:_ Transistores, computación, telecomunicaciones satelitales, automatización industrial, energías renovables.
5. **Etapa V (Futurista / Espacial):**
   - _IA & Automatización Avanzada:_ Robótica autónoma, síntesis de materiales, redes logísticas neuronales.
   - _Fusión:_ Reactores de fusión compactos, superconductores a temperatura ambiente.
   - _Espacio Temprano:_ Ascensores orbitales, bases lunares, minería de asteroides.
   - _Interestelar:_ Motores de curvatura/antimateria, terraformación de exoplanetas, créditos universales.
