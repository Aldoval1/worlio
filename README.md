# 🪐 UNIVERSO RTS — Monorepo del Motor 3D Persistente WebGPU

Videojuego comercial MMO-RTS y constructor de ciudades 3D persistente en navegador web, desarrollado con **Babylon.js WebGPUEngine**, arquitectura de servidor autoritativo y generación procedural determinista de planetas de 250 km de diámetro.

---

## 🏗️ Arquitectura del Monorepo

```
Worlio/
├── apps/
│   ├── client/              # Cliente 3D Babylon.js (WebGPUEngine exclusivo) + Vite
│   └── server/              # Servidor autoritativo Node.js (Express + WebSocket + persistencia)
├── packages/
│   ├── shared/              # Contratos versionados, IDs tipados, DTOs y matemática 3D
│   ├── worldgen/            # Generación determinista (Cube-Sphere, Simplex 3D, sampleTerrain)
│   └── domain/              # Lógica pura de juego, invariantes de inventario y estado
├── docs/                    # Documentación maestra, GDD, ADRs, riesgos y evidencias
│   ├── 00_VISION.md         # North Star, pilares y requisitos maestros
│   ├── ARCHITECTURE.md      # Aislamiento modular, precisión de coordenadas y modelo temporal
│   ├── ART_BIBLE.md         # Dirección artística y especificación de activos 3D
│   ├── BACKLOG.md           # Seguimiento de 64 tickets (T01 a T64)
│   ├── DECISIONS.md         # ADR-0001 a ADR-0007
│   ├── DEFINITION_OF_DONE.md# Invariantes no negociables y checklist
│   └── evidence/            # Informes de ejecución verificables por ticket
├── pnpm-workspace.yaml      # Definición de espacios de trabajo pnpm
├── tsconfig.base.json       # Configuración TypeScript estricta unificada
└── railway.json             # Despliegue en Railway
```

---

## 🛠️ Requisitos de Entorno

- **Node.js:** $\ge 20.0.0$ LTS
- **pnpm:** $\ge 10.0.0$ (recomendado 12.x)
- **Navegador:** Navegador moderno con soporte para **WebGPU** (Chrome 113+, Edge 113+, Safari 18+ en macOS Sequoia, o Firefox con `dom.webgpu.enabled`).

---

## 🚀 Guía de Arranque Rápido

### 1. Instalación limpia de dependencias
```bash
pnpm install
```

### 2. Verificación de Tipos y Compilación (TypeScript Estricto)
```bash
pnpm run check
pnpm run build
```

### 3. Ejecutar Suite de Tests (Vitest)
```bash
pnpm test
```

### 4. Iniciar Servidor y Cliente (Local)
```bash
pnpm start
```
- Servidor HTTP & WebSocket: `http://localhost:3000`
- Endpoint de salud (Health Check): `http://localhost:3000/health`
- API de terreno determinista: `http://localhost:3000/api/terrain/sample?x=0&y=1&z=0`

---

## 🚂 Despliegue en Railway

El proyecto está configurado para desplegarse automáticamente en Railway a través del repositorio de GitHub:
- Puerto dinámico configurado mediante `process.env.PORT`.
- Enlace con todas las interfaces de red (`0.0.0.0`).
- Detección automática mediante Nixpacks y `railway.json`.
- Health check configurado en `/health`.
