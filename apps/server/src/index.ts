import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  PROTOCOL_VERSION,
  createPlanetId,
  createFacilityId,
  createFactionId,
  createLotId,
  createResourceId,
  type PlanetDefinition,
  type InventoryLotDTO,
  type ShipmentDTO,
  type ClientMessage,
  type ServerMessage
} from '@universo/shared';
import { InventoryDomainService, type InventoryLot } from '@universo/domain';
import { TerrainSampler } from '@universo/worldgen';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

// Configuración de encabezados
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// Servir cliente compilado o estáticos
const clientDistPath = path.resolve(__dirname, '../../client/dist');
const fallbackPublicPath = path.resolve(__dirname, '../../../public');

app.use(express.static(clientDistPath));
app.use(express.static(fallbackPublicPath));

// Health check para Railway
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'universo-rts-server',
    protocol: PROTOCOL_VERSION,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/planet', (_req, res) => {
  res.json(defaultPlanet);
});

app.get('/api/terrain/sample', (req, res) => {
  const x = Number(req.query['x']) || 0;
  const y = Number(req.query['y']) || 1;
  const z = Number(req.query['z']) || 0;
  const len = Math.hypot(x, y, z) || 1;
  const sample = sampler.sample(x / len, y / len, z / len);
  res.json(sample);
});

// Fallback SPA
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.sendFile(path.join(fallbackPublicPath, 'index.html'));
    }
  });
});

// --- ESTADO AUTORITATIVO EN MEMORIA ---
const defaultPlanet: PlanetDefinition = {
  planetId: createPlanetId('terra-prime'),
  seed: 'UNIVERSO-TERRA-2026',
  generatorVersion: 'v1.0.0',
  radiusMeters: 125000.0, // 250 km de diámetro
  seaLevelMeters: 0.0,
  terrain: {
    octaves: 6,
    persistence: 0.5,
    lacunarity: 2.0,
    heightScale: 4000.0
  }
};

const sampler = new TerrainSampler(defaultPlanet);

// Lotes de prueba en almacén de la ciudad
const lots = new Map<string, InventoryLot>();
const lotMadera: InventoryLot = {
  id: createLotId('lot-madera-01'),
  locationId: createFacilityId('almacen-central'),
  ownerId: createFactionId('alcaldia-01'),
  resourceId: createResourceId('madera'),
  onHand: 500,
  reserved: 0,
  version: 1
};
const lotPiedra: InventoryLot = {
  id: createLotId('lot-piedra-01'),
  locationId: createFacilityId('almacen-central'),
  ownerId: createFactionId('alcaldia-01'),
  resourceId: createResourceId('piedra'),
  onHand: 300,
  reserved: 0,
  version: 1
};
lots.set(lotMadera.id, lotMadera);
lots.set(lotPiedra.id, lotPiedra);

const shipments = new Map<string, ShipmentDTO>();
const idempotencyKeys = new Set<string>();

let sequenceCounter = 1;
const epoch = Math.floor(Date.now() / 1000);

// --- PROTOCOLO WEBSOCKET ---
wss.on('connection', (ws: WebSocket) => {
  console.log(`🔌 Cliente WebSocket conectado (Protocolo v${PROTOCOL_VERSION})`);

  ws.on('message', (data: Buffer | string) => {
    try {
      const msg: ClientMessage = JSON.parse(data.toString());

      switch (msg.type) {
        case 'PING': {
          const pong: ServerMessage = {
            type: 'PONG',
            timestamp: msg.timestamp,
            serverTimeUtc: new Date().toISOString()
          };
          ws.send(JSON.stringify(pong));
          break;
        }

        case 'REQUEST_SYNC': {
          const inventoriesDto: InventoryLotDTO[] = Array.from(lots.values()).map((l) => ({
            id: l.id,
            locationId: l.locationId,
            ownerId: l.ownerId,
            resourceId: l.resourceId,
            quantity: l.onHand,
            reserved: l.reserved,
            version: l.version
          }));

          const snapshot: ServerMessage = {
            type: 'SYNC_SNAPSHOT',
            epoch,
            sequence: sequenceCounter++,
            planet: defaultPlanet,
            inventories: inventoriesDto,
            shipments: Array.from(shipments.values())
          };
          ws.send(JSON.stringify(snapshot));
          break;
        }

        case 'DISPATCH_SHIPMENT': {
          if (idempotencyKeys.has(msg.idempotencyKey)) {
            // Ya procesado: idempotencia garantizada
            console.log(`⚠️ Clave idempotente repetida: ${msg.idempotencyKey}`);
            return;
          }

          // Buscar lote
          const lot = Array.from(lots.values()).find(
            (l) => l.locationId === msg.originId && l.resourceId === msg.resourceId
          );

          if (!lot) {
            const errResp: ServerMessage = {
              type: 'ERROR',
              code: 'LOT_NOT_FOUND',
              message: `No se encontró lote de ${msg.resourceId} en ${msg.originId}`
            };
            ws.send(JSON.stringify(errResp));
            return;
          }

          // Reservar atómicamente
          try {
            const updatedLot = InventoryDomainService.reserve(lot, msg.amount);
            lots.set(updatedLot.id, updatedLot);
            idempotencyKeys.add(msg.idempotencyKey);

            // Broadcast de actualización a todos los clientes conectados
            const notif: ServerMessage = {
              type: 'EVENT_NOTIFICATION',
              sequence: sequenceCounter++,
              eventType: 'INVENTORY_RESERVED',
              payload: {
                lotId: updatedLot.id,
                amount: msg.amount,
                remainingAvailable: InventoryDomainService.getAvailable(updatedLot)
              }
            };
            const broadcastPayload = JSON.stringify(notif);
            for (const client of wss.clients) {
              if (client.readyState === WebSocket.OPEN) {
                client.send(broadcastPayload);
              }
            }
          } catch (err: unknown) {
            const errMessage = err instanceof Error ? err.message : 'Error desconocido';
            const errResp: ServerMessage = {
              type: 'ERROR',
              code: 'INVENTORY_RESERVE_FAILED',
              message: errMessage
            };
            ws.send(JSON.stringify(errResp));
          }
          break;
        }
      }
    } catch (parseErr) {
      console.error('Error parseando mensaje WebSocket:', parseErr);
    }
  });

  ws.on('close', () => {
    console.log('❌ Cliente WebSocket desconectado.');
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`=================================================`);
  console.log(`🪐 UNIVERSO RTS — Servidor Autoritativo v${PROTOCOL_VERSION}`);
  console.log(`🌐 HTTP y WebSockets escuchando en ${HOST}:${PORT}`);
  console.log(`📡 Railway Ready: http://localhost:${PORT}`);
  console.log(`=================================================`);
});
