import { describe, it, expect } from 'vitest';
import {
  ClientCommandSchema,
  ServerMessageSchema,
  InventoryLotDTOSchema,
  PlanetDefinitionSchema,
  createPlanetId,
  createFacilityId,
  createFactionId,
  createLotId,
  createResourceId
} from '../index.js';

describe('Contracts & Schemas Runtime Validation (T05)', () => {
  it('valida comandos de cliente DISPATCH_SHIPMENT con datos válidos', () => {
    const rawCommand = {
      type: 'DISPATCH_SHIPMENT',
      idempotencyKey: 'idemp-123456789',
      originId: 'fac-almacen-01',
      destinationId: 'fac-taller-01',
      resourceId: 'madera',
      amount: 150
    };

    const parsed = ClientCommandSchema.safeParse(rawCommand);
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.type === 'DISPATCH_SHIPMENT') {
      expect(parsed.data.amount).toBe(150);
      expect(parsed.data.originId as string).toBe('fac-almacen-01');
    }
  });

  it('rechaza comandos con cantidades negativas, cero o no enteras', () => {
    const negativeCommand = {
      type: 'DISPATCH_SHIPMENT',
      idempotencyKey: 'idemp-123456789',
      originId: 'fac-almacen-01',
      destinationId: 'fac-taller-01',
      resourceId: 'madera',
      amount: -50
    };
    expect(ClientCommandSchema.safeParse(negativeCommand).success).toBe(false);

    const zeroCommand = { ...negativeCommand, amount: 0 };
    expect(ClientCommandSchema.safeParse(zeroCommand).success).toBe(false);

    const floatCommand = { ...negativeCommand, amount: 45.5 };
    expect(ClientCommandSchema.safeParse(floatCommand).success).toBe(false);
  });

  it('rechaza lotes de inventario donde reserved supera a quantity (invariante económico)', () => {
    const corruptedLot = {
      id: createLotId('lot-corrupt-01'),
      locationId: createFacilityId('fac-01'),
      ownerId: createFactionId('fac-01'),
      resourceId: createResourceId('hierro'),
      quantity: 100,
      reserved: 120, // VIOLACIÓN: reserved > quantity
      version: 1
    };

    const parsed = InventoryLotDTOSchema.safeParse(corruptedLot);
    expect(parsed.success).toBe(false);
  });

  it('valida roundtrip y campos de PlanetDefinition', () => {
    const planetData = {
      planetId: createPlanetId('planet-terra-prime'),
      seed: 'SEED-2026-TERRA',
      generatorVersion: 'v1.0.0',
      radiusMeters: 125000,
      seaLevelMeters: 0,
      terrain: {
        octaves: 6,
        persistence: 0.5,
        lacunarity: 2.0,
        heightScale: 4000
      }
    };

    const parsed = PlanetDefinitionSchema.safeParse(planetData);
    expect(parsed.success).toBe(true);

    // Serialización y deserialización idéntica (Roundtrip)
    const jsonStr = JSON.stringify(parsed.data);
    const roundtrip = PlanetDefinitionSchema.parse(JSON.parse(jsonStr));
    expect(roundtrip.radiusMeters).toBe(125000);
  });

  it('valida mensaje de snapshot completo del servidor', () => {
    const rawSnapshot = {
      type: 'SYNC_SNAPSHOT',
      epoch: 1728770000,
      sequence: 42,
      planet: {
        planetId: 'planet-terra-prime',
        seed: 'SEED-2026-TERRA',
        generatorVersion: 'v1.0.0',
        radiusMeters: 125000,
        seaLevelMeters: 0,
        terrain: {
          octaves: 6,
          persistence: 0.5,
          lacunarity: 2.0,
          heightScale: 4000
        }
      },
      inventories: [
        {
          id: 'lot-madera-01',
          locationId: 'fac-almacen-01',
          ownerId: 'faction-01',
          resourceId: 'madera',
          quantity: 500,
          reserved: 100,
          version: 1
        }
      ],
      shipments: []
    };

    const parsed = ServerMessageSchema.safeParse(rawSnapshot);
    expect(parsed.success).toBe(true);
  });

  it('rechaza discriminadores de mensaje desconocidos', () => {
    const unknownMsg = {
      type: 'HACK_ADD_MONEY',
      amount: 1000000
    };
    expect(ClientCommandSchema.safeParse(unknownMsg).success).toBe(false);
  });
});
