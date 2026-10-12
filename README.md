# 🎮 Worlio - WebGPU 3D Game Engine

Base y punto de partida para un videojuego 3D en la web utilizando la API nativa de **WebGPU** y desplegado en **Railway**.

---

## 🌟 Características Actuales

- **Renderizado 3D con WebGPU Nativo:** Pipeline moderno programado con WGSL (WebGPU Shading Language), sin librerías pesadas externas.
- **Plano 3D Subdividido:** Superficie de suelo 3D (40x40 m) lista para físicas, deformación y colocación de modelos.
- **Shader Procedural con Antialiasing:** Rejilla matemática limpia generada por hardware con `fwidth`, líneas maestras cada 5m, ejes coordenados (X rojo, Z azul) y niebla de distancia.
- **Cámara Orbital Suave (Orbit Controls):** Control con ratón y pantalla táctil (rotación, zoom con rueda, paneo con clic derecho/shift) y amortiguación física (damping).
- **HUD con Diagnósticos en Tiempo Real:** Monitor de FPS, detección del chipset/adaptador GPU y botón de auto-rotación.
- **Detección Automática y Fallback:** Mensaje claro de ayuda para activar WebGPU en caso de que el navegador no lo tenga habilitado.
- **Servidor Express Optimizado para Railway:** Configurado con variables dinámicas de puerto (`PORT`), escucha en `0.0.0.0` y endpoint `/health`.

---

## 🚀 Estructura del Proyecto

```
Worlio/
├── public/                 # Archivos estáticos del cliente
│   ├── index.html          # Canvas WebGPU, HUD y pantalla fallback
│   ├── style.css           # Estilos oscuros modernos
│   └── js/
│       ├── math.js         # Álgebra lineal 3D (Mat4, Vec3)
│       ├── camera.js       # Controles de cámara orbital suave
│       ├── plane.js        # Generador de malla del plano 3D
│       ├── shaders.js      # Shaders WGSL (Vertex & Fragment)
│       └── main.js         # Pipeline WebGPU, buffers y ciclo de render
├── server.js               # Servidor Node.js Express para Railway
├── package.json            # Dependencias y scripts de inicio
├── railway.json            # Configuración de despliegue en Railway
├── Dockerfile              # Contenedor alternativo de producción
├── .gitignore              # Archivos ignorados por Git
└── README.md
```

---

## 💻 Ejecución Local

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Iniciar el servidor:
   ```bash
   npm start
   ```

3. Abrir en el navegador:
   ```
   http://localhost:3000
   ```

---

## 🚂 Despliegue en Railway

El proyecto está 100% preparado para Railway:
1. En Railway, crea un nuevo proyecto seleccionando **Deploy from GitHub repo**.
2. Selecciona el repositorio **Aldoval1/worlio**.
3. Railway detectará automáticamente el archivo `railway.json` / `package.json`, instalará las dependencias y ejecutará `npm start`.
4. ¡Tu videojuego 3D estará en línea en segundos con HTTPS automático!

---

## 🎮 Controles de Cámara

| Acción | Control |
| :--- | :--- |
| **Rotar (Orbit)** | Clic izquierdo y arrastrar / Toque con 1 dedo |
| **Zoom** | Rueda del ratón / Pellizcar con 2 dedos |
| **Desplazar (Pan)** | Clic derecho y arrastrar / Shift + Clic |
| **Pausar Rotación** | Botón "Auto-Rotación" en el panel |
| **Centrar Vista** | Botón "Centrar Cámara" en el panel |
