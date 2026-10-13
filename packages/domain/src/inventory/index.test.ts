import { describe, it, expect } from 'vitest';
import { InventoryDomainService, type InventoryLot } from './index.js';
import { createLotId, createFacilityId, createFactionId, createResourceId } from '@universo/shared';

describe('InventoryDomainService (Invariante Físico de Inventario)', () => {
  const mockLot: InventoryLot = {
    id: createLotId('lot-test-01'),
    locationId: createFacilityId('almacen-01'),
    ownerId: createFactionId('fac-01'),
    resourceId: createResourceId('madera'),
    onHand: 100,
    reserved: 0,
    version: 1
  };

  it('calcula available correctamente (onHand - reserved >= 0)', () => {
    const avail = InventoryDomainService.getAvailable(mockLot);
    expect(avail).toBe(100);
  });

  it('reserva atómicamente y actualiza versión', () => {
    const reservedLot = InventoryDomainService.reserve(mockLot, 40);
    expect(reservedLot.reserved).toBe(40);
    expect(reservedLot.onHand).toBe(100);
    expect(InventoryDomainService.getAvailable(reservedLot)).toBe(60);
    expect(reservedLot.version).toBe(2);
  });

  it('rechaza reserva si excede el stock disponible', () => {
    expect(() => {
      InventoryDomainService.reserve(mockLot, 150);
    }).toThrowError(/Existencias insuficientes/);
  });

  it('libera reserva de forma segura', () => {
    const reservedLot = InventoryDomainService.reserve(mockLot, 30);
    const releasedLot = InventoryDomainService.release(reservedLot, 30);
    expect(releasedLot.reserved).toBe(0);
    expect(InventoryDomainService.getAvailable(releasedLot)).toBe(100);
  });

  it('consume material reservado físicamente al salir en convoy', () => {
    const reservedLot = InventoryDomainService.reserve(mockLot, 50);
    const consumedLot = InventoryDomainService.consumeReserved(reservedLot, 50);
    expect(consumedLot.onHand).toBe(50);
    expect(consumedLot.reserved).toBe(0);
    expect(InventoryDomainService.getAvailable(consumedLot)).toBe(50);
  });
});
